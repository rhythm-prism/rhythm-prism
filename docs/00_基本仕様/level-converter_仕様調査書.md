# レベルコンバーター仕様調査書

## 0. 概要

`rp-level-converter/` は譜面データを Rhythm Prism バックエンドが利用する LevelData 形式へ変換する Node.js HTTP サービスである。Hono による HTTP サーバーを起動し、`POST /convert` で受け取ったデータの形式を判定して LevelData を JSON 応答する。バックエンドは投稿譜面の変換処理からこのサービスを呼び出し、結果を圧縮して保存する。参照: [src/index.ts](../../rp-level-converter/src/index.ts)、[rp-backend/utils/converter.py](../../rp-backend/utils/converter.py)、[rp-backend/utils/convert_tasks.py](../../rp-backend/utils/convert_tasks.py)

対応経路は gzip 圧縮された LevelData JSON、USC を含む JSON、SUS テキストである。USC から LevelData への変換にはローカル実装を使い、SUS は依存ライブラリを介して USC に変換した後、外部エンジンの LevelData 変換を使う。入力ファイル形式や出力の妥当性を検証する独立した API は確認できない。

## 1. 機能一覧

| 機能 | 概要 | 主な根拠 |
|---|---|---|
| 稼働確認 | `GET /` に対して `ok` を返す。 | [src/index.ts](../../rp-level-converter/src/index.ts) |
| LevelData の受け入れ | gzip を展開して JSON として読み込み、形式名 `leveldata` とともに返す。 | [src/index.ts](../../rp-level-converter/src/index.ts) |
| USC JSON 変換 | JSON 内の `usc` データをローカル変換処理で LevelData に変換する。 | [src/index.ts](../../rp-level-converter/src/index.ts)、[src/usc/usc2levedata.ts](../../rp-level-converter/src/usc/usc2levedata.ts) |
| SUS 変換 | テキストを SUS として USC に変換し、依存エンジンの変換処理で LevelData を生成する。 | [src/index.ts](../../rp-level-converter/src/index.ts)、[package.json](../../rp-level-converter/package.json) |
| USC 変換モジュール | `usctool` で入力を USC に変換し、ローカル LevelData 変換器へ渡す関数を提供する。 | [src/usc/convert.ts](../../rp-level-converter/src/usc/convert.ts)、[src/usc/index.ts](../../rp-level-converter/src/usc/index.ts) |

## 2. 機能詳細

### 2.1 HTTP サービスと稼働確認

サービス起動時に Hono アプリケーションを Node サーバーへ渡し、ソースコード上ではポート `5003` で待ち受ける。`GET /` はプレーンテキスト `ok` を返す。HTTP サーバー起動時のホスト指定、認証、入力サイズ制限（圧縮展開後サイズを除く）、レート制限はコード上では確認できない。参照: [src/index.ts](../../rp-level-converter/src/index.ts)

Dockerfile はビルド成果物を `dist/` に配置し、コンテナーの `EXPOSE` を `5005` としている。一方、アプリケーションのポートは `5003` に固定されている。コンテナー実行時のポート公開・転送設定との整合性は対象コードだけでは確認できない。参照: [Dockerfile](../../rp-level-converter/Dockerfile)、[src/index.ts](../../rp-level-converter/src/index.ts)

### 2.2 `POST /convert` の入出力と形式判定

リクエストボディ全体をバイト列として読み込み、次の順に解釈を試みる。

1. gzip 展開を試み、展開後の UTF-8 文字列を JSON として解析する。成功時は LevelData として扱い、`chartformat` を `leveldata` にする。展開後の上限は `100 * 1024 * 1024` バイト（100 MiB）に設定されている。
2. gzip/JSON の処理が例外になった場合、元のボディを UTF-8 JSON として解析し、トップレベルの `usc` プロパティをローカル変換器に渡す。成功時の `chartformat` は `usc` となる。
3. USC JSON の処理も例外になった場合、元のボディを SUS テキストとして `susToUSC` に渡し、外部エンジンの変換器で LevelData を生成する。成功時の `chartformat` は `sus` となる。

成功時は HTTP 200 の JSON `{ "chartformat": "...", "leveldata": ... }` を返す。全ての処理が失敗した場合は HTTP 500 と `{ "error": "<例外文字列>" }` を返す。入力形式を明示するヘッダーや別のエラーコード体系は実装されていない。なお例外は各段階で次形式の判定へ進むため、エラーの種類だけで形式を決定しているわけではない。参照: [src/index.ts](../../rp-level-converter/src/index.ts)

### 2.3 USC から LevelData へのローカル変換

ローカル変換器は USC の `offset` とオプションの追加 offset を合計して LevelData の `bgmOffset` に設定する。出力エンティティには初期化情報を含め、BPM 変更、タイムスケールグループと変更、単独ノート、ダメージノート、スライド、ガイドノート等を LevelData のエンティティに変換する。スライド接続に応じて Connector、TransientHiddenTickNote 等を作り、条件を満たすノートから SimLine も生成する。エンティティ参照名は16進数の連番で割り当てられる。参照: [usc2levedata.ts](../../rp-level-converter/src/usc/usc2levedata.ts)、[type.ts](../../rp-level-converter/src/usc/type.ts)

ガイドノートは中間点が2個未満の場合、スライドへ変換されない。スライドの接続点・補間・イージング等は変換器内の規則に従う。正確なエンジン上の表示結果や、すべての USC 入力に対する互換性はこのコードだけでは確認できない。

`src/usc/convert.ts` は `usctool` の `anyToUSC` を使って入力バイト列から形式と USC を取り出し、ローカル変換器へ渡す関数を公開する。ただし HTTP エントリーポイントの実装ではこの関数を呼ばず、USC JSON と SUS を個別の経路で処理する。参照: [convert.ts](../../rp-level-converter/src/usc/convert.ts)、[src/index.ts](../../rp-level-converter/src/index.ts)

### 2.4 バックエンドとの連携

バックエンドの変換処理は設定されたレベルコンバーター URL に `/convert` を付けて、元譜面バイト列を HTTP POST する。タイムアウトは30秒で、HTTP 200 以外は変換失敗として扱う。正常応答から `chartformat` と `leveldata` を取り出し、LevelData JSON を gzip 圧縮してストレージへ保存する。バックエンドはサービス固有の入力ファイル上限も設けるが、コンバーターの `/convert` 単体には展開後サイズ以外の入力上限が見当たらない。参照: [rp-backend/utils/converter.py](../../rp-backend/utils/converter.py)、[rp-backend/utils/convert_tasks.py](../../rp-backend/utils/convert_tasks.py)、[rp-backend/const/env.py](../../rp-backend/const/env.py)

### 2.5 ビルド・テスト上の前提

`npm run build` は TypeScript コンパイルを実行し、`npm run start` は `dist/index.js` を起動する。`npm run dev` は `tsx watch` による開発起動である。`package.json` にテスト実行スクリプトは定義されていない。`test/` には USC、SUS、LevelData のデータファイルがあるが、これらを自動テストで実行する定義は確認できない。参照: [package.json](../../rp-level-converter/package.json)、[tsconfig.json](../../rp-level-converter/tsconfig.json)

## 3. バージョン履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| 1.0 | 2026-10-22 | コードベースを調査し、現在確認できるレベルコンバーター仕様を初版として記録。 |
