# RhythmPrism Value Stream Map

このドキュメントは各サービスの実装を毎回読み直す代わりに参照する、処理フローのスナップショット。
機械可読版は [vsm.json](vsm.json)。**コードが正であり、このファイルは補助**。大きな構成変更（エンドポイント追加/削除、サービス間呼び出しの変更）をしたら追従して更新すること。

作成時点: 2026-07-15 時点のソースを rp-backend / rp-frontend / rp-bgm-converter / rp-image-converter / rp-level-converter / docker-compose / nginx.conf から調査して作成。

## サービス一覧とポート

| サービス | 役割 | ポート | 依存 |
|---|---|---|---|
| nginx | リバースプロキシ (`/api`,`/sonolus` → backend, それ以外 → frontend) | 80 | frontend, backend |
| rp-frontend | Web UI (React SPA) | 5000 | backend のみ（converterへの直接依存なし） |
| rp-backend | REST API 兼 Sonolusプロトコル実装 | 5001 | postgres, s3(MinIO), 3つのconverter |
| postgres | メインDB | 5002→5432 | - |
| s3 (MinIO, dev環境のみ) | オブジェクトストレージ。本番はAWS S3想定 | 9000/9001 | - |
| rp-bgm-converter | 音源変換 (ffmpeg) | 5003 | s3依存なし（バイトを返すのみ） |
| rp-image-converter | ジャケット/背景画像変換 (Pillow) | 5004 | s3依存なし（バイトを返すのみ） |
| rp-level-converter | 譜面(USC/SUS)変換 (Hono) | 5005 | s3依存なし（JSONを返すのみ） |

**重要な設計:** 3つのconverterはすべてステートレスな「バイト/JSON in → バイト/JSON out」の変換器で、
S3やDBには一切触れない。ストレージへの永続化・DB書き込みは常に **rp-backend側の責務**。

## 主要フロー 1: 譜面投稿 (post_chart)

ユーザーが rp-frontend の `SubmitChart.tsx` から譜面ファイル・BGM・ジャケット画像・メタデータを送信し、
公開可能な譜面としてDB+S3に保存されるまでの流れ。

```mermaid
flowchart TD
    subgraph FE["rp-frontend"]
        A["SubmitChart.tsx<br/>metadata + chart_file + bgm_file + jacket_file"]
    end

    subgraph BE["rp-backend (post_chart.py)"]
        B["POST /api/chart<br/>multipart受信 → chart_id採番"]
        F["SHA1ハッシュ計算 → S3キー生成"]
        G["S3へ並列アップロード<br/>(asyncio.gather)"]
        H["Chart / BackgroundItem<br/>行をINSERT → commit"]
        I["BackgroundTask:<br/>Discord webhook通知"]
        J["APScheduler:<br/>SCHEDULED → PUBLIC 予約"]
    end

    subgraph LC["rp-level-converter :5005"]
        C["POST /convert<br/>SUS/USC/leveldata自動判別<br/>→ {chartformat, leveldata} JSON"]
    end
    subgraph BC["rp-bgm-converter :5003"]
        D["POST /convert<br/>ffmpeg変換<br/>→ zip(bgm.mp3, preview.mp3)"]
    end
    subgraph IC["rp-image-converter :5004"]
        E["POST /convert<br/>Pillow変換<br/>→ zip(jacket.png, bg.png)"]
    end

    subgraph S3["MinIO / S3"]
        S["chart_id/sha1 キーで格納"]
    end
    subgraph DB["PostgreSQL"]
        T["charts, background_items"]
    end

    A -->|"POST /api/chart"| B
    B --> C
    B --> D
    B --> E
    C --> F
    D --> F
    E --> F
    F --> G
    G --> S
    G --> H
    H --> T
    H --> I
    H --> J
```

- 3つのconverter呼び出しは並行に実行できる独立処理（互いに依存しない）。
- `utils/convert.py` が3つの converter クライアントの実体（`convert_chart` / `convert_bgm` / `convert_jacket`）。
- 環境変数 `LEVEL_CONVERTER_URL` / `BGM_CONVERTER_URL` / `IMAGE_CONVERTER_URL`（`const/env.py`）でURL解決。

## 主要フロー 2: 譜面編集 (edit_chart)

投稿フローとほぼ同じだが、フィールド単位で差分適用する点が異なる。

```mermaid
flowchart LR
    A["EditChart.tsx<br/>差し替えたいフィールド/ファイルのみ送信"] -->|"PUT /api/chart?chart_id="| B["edit_chart.py"]
    B -->|"変更されたファイルのみ"| C["対象converterを呼び出し"]
    C --> D["新ファイルをS3にアップロード"]
    D --> E["旧S3オブジェクトを削除"]
    E --> F["Chart行をUPDATE → commit"]
    F --> G["BackgroundTask: 初回公開時のみ<br/>Discord webhook通知"]
```

## 主要フロー 3: Sonolus クライアントからの読み取り

ゲームクライアント（Sonolus本体）は変換を一切行わず、公開済みDB行とS3の公開URLをそのまま返すだけ。

```mermaid
flowchart LR
    Client["Sonolusゲームクライアント"] -->|"認証: sonolus_id照合"| Auth["router/sonolus/authenticate.py"]
    Client -->|"ホーム画面/検索/詳細/コミュニティ"| Info["router/sonolus/{info,list,detail,community}/*"]
    Info -->|"SELECT"| DB[("PostgreSQL")]
    Info -->|"S3公開URLをそのまま返す"| S3[("MinIO/S3<br/>(S3_HOST + key)")]
```

## 主要フロー 4: 認証（2系統が独立に存在）

- **Web (rp-frontend)**: Discord OAuth2 → `router/web/user/discord.py` → `User` 作成/更新 → httpOnly JWT cookie（`access_token`/`refresh_token`）。以後 `utils/dependencies.get_current_user_id` がcookieを検証。
- **Sonolusゲームクライアント**: `router/sonolus/authenticate.py` が `sonolus_id` で `User` と紐付け、Sonolus専用セッションIDを発行。Web用JWTとは別物。
- 2つのアカウントを紐付けるのが `router/web/user/sonolus.py`（Sonolusアカウント連携）。

## トークン節約のための使い方（AIエージェント向け）

- 「どのサービスが何を呼ぶか」を確認したいだけなら、このファイルと [vsm.json](vsm.json) を読めば rp-backend の `utils/convert.py` や各converterの `main.py` を毎回読み直す必要はない。
- 実装の詳細（バリデーション、エラーハンドリング、具体的なフィールド名等）はここには含めていない。ロジック修正が必要な場合は該当ファイル（下記 `key_files` in vsm.json）を直接読むこと。
- このファイルは構造が変わった時だけ更新すればよい。日々の実装差分は追従不要。
