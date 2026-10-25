# バックエンド仕様調査書

## 0. 概要

`rp-backend/` は Rhythm Prism の HTTP API と Sonolus サーバー API を提供する FastAPI アプリケーションである。ブラウザーのフロントエンドから譜面・ユーザー・お知らせ等の情報を受け取り、PostgreSQL に状態を保存する。譜面、音源、画像の変換や S3 への保存には Celery タスク、Redis、レベルコンバーターを使用する。Sonolus クライアントには譜面等のアイテム一覧・詳細、認証、譜面への「いいね」を提供する。

主な連携先は、[rp-frontend](../../rp-frontend/)、[rp-level-converter](../../rp-level-converter/)、PostgreSQL、Redis、S3 互換ストレージ、Discord OAuth/API、Sonolus クライアントである。Web API は `/api` 配下、Sonolus API は別ルーターとして登録される。起動時に DB モデルのテーブルを初期化し、設定条件に応じて Sonolus アイテム資源を準備する。参照: [main.py](../../rp-backend/main.py)、[router/index.py](../../rp-backend/router/index.py)、[router/web/index.py](../../rp-backend/router/web/index.py)、[router/sonolus/index.py](../../rp-backend/router/sonolus/index.py)

実行には設定値が必要であり、設定名は [const/env.py](../../rp-backend/const/env.py) に定義されている。実際の値、各環境での設定方法、外部サービスの稼働状態はコードからは確認できない。

## 1. 機能一覧

| 機能 | 概要 | 主な根拠 |
|---|---|---|
| アプリケーション起動・データ保管 | FastAPI 起動時の DB 初期化、PostgreSQL/Redis/S3/Celery 連携を行う。 | [main.py](../../rp-backend/main.py)、[db/session.py](../../rp-backend/db/session.py)、[celery_app.py](../../rp-backend/celery_app.py) |
| 譜面の閲覧・検索 | 公開譜面を条件指定して検索し、譜面詳細・ページング情報を返す。 | [get_chart.py](../../rp-backend/router/web/chart/get_chart.py) |
| 譜面の投稿・編集・削除・ダウンロード | 譜面情報とファイルを受け付け、権限に応じて更新・論理削除・原本取得を行う。 | [post_chart.py](../../rp-backend/router/web/chart/post_chart.py)、[edit_chart.py](../../rp-backend/router/web/chart/edit_chart.py)、[delete_chart.py](../../rp-backend/router/web/chart/delete_chart.py)、[download_chart.py](../../rp-backend/router/web/chart/download_chart.py) |
| 譜面ファイル・画像・音源の変換と保管 | 投稿ファイルを非同期変換し、S3 互換ストレージの参照先と変換状態を DB に記録する。 | [convert_tasks.py](../../rp-backend/utils/convert_tasks.py)、[converter.py](../../rp-backend/utils/converter.py)、[s3utils.py](../../rp-backend/utils/s3utils.py) |
| 認証・ユーザー管理 | Discord OAuth、Sonolus 認証、Cookie セッション、ユーザー情報取得・編集を提供する。 | [discord.py](../../rp-backend/router/web/user/discord.py)、[sonolus.py](../../rp-backend/router/web/user/sonolus.py)、[auth.py](../../rp-backend/router/web/user/auth.py)、[edit_user.py](../../rp-backend/router/web/user/edit_user.py) |
| 譜面制作者の承認 | 制作者申請、審査一覧・詳細、複数審査者による承認・却下を処理する。 | [auth_charter.py](../../rp-backend/router/web/user/auth_charter.py) |
| Sonolus サーバー | Sonolus 向けサーバー情報、レベル等のアイテム情報、認証、譜面への反応を提供する。 | [router/sonolus/](../../rp-backend/router/sonolus/)、[utils/sonolus/](../../rp-backend/utils/sonolus/) |
| お知らせ・運営情報・共有カード | お知らせの取得・管理、サーバー統計、リンク共有用 OGP HTML を提供する。 | [announce.py](../../rp-backend/router/web/announce.py)、[chart.py](../../rp-backend/router/web/server_info/chart.py)、[ogp.py](../../rp-backend/router/web/ogp.py) |
| タグ管理 | 譜面タグの一覧取得と、運営権限による追加・削除を行う。 | [tag.py](../../rp-backend/router/web/chart/tag.py) |

## 2. 機能詳細

### 2.1 アプリケーションの起動とデータ保管

FastAPI の起動時に SQLAlchemy のモデルからテーブルを作成する。`USE_UVICORN` が `"1"` の場合は Sonolus アイテム資源も起動時にロードする。`icon.ico` を起動時に読み込み、`/favicon.ico` で返す。`/` は空文字を返し、FastAPI の自動ドキュメント画面は無効化されている。DB 接続は PostgreSQL、非同期・同期の両方のセッションを用意する。参照: [main.py](../../rp-backend/main.py)、[db/session.py](../../rp-backend/db/session.py)、[const/env.py](../../rp-backend/const/env.py)

Celery は Redis を broker/backend として使い、変換タスクを登録する。変換ファイルや画像等の本体は S3 互換ストレージに保存し、DB には URL とハッシュ等の参照情報を保存する。実際の接続先・資格情報は環境設定に依存し、ここでは値を記載しない。参照: [celery_app.py](../../rp-backend/celery_app.py)、[utils/s3utils.py](../../rp-backend/utils/s3utils.py)、[db/models.py](../../rp-backend/db/models.py)

### 2.2 譜面の閲覧・検索

- `GET /api/chart/search` は、公開状態かつ論理削除されていない譜面を対象に、キーワード、レベル範囲、R18、合作、難易度、ジャンル、タグ、イベント、ユーザーで絞り込む。並び順は新着または「いいね」数、昇順・降順を選べる。件数は1〜20に制限され、次ページ用カーソルと次ページ有無が返る。
- キーワード検索対象は譜面 ID、タイトル、作曲者、ボーカル、表示名、ユーザー名、イベント名である。`r18` が false の場合は安全区分のみ、`collabo` が true の場合は合作譜面のみを返す。
- `GET /api/chart?chart_id=...` は、論理削除されていない ID の譜面詳細を返す。実装では公開状態を確認していないため、非公開譜面でも ID が分かれば詳細を取得できる。原本譜面の URL は原本公開設定が公開の場合だけ返すが、変換済みのレベルデータ、BGM、プレビュー等は存在すれば詳細応答に含まれる。
- `GET /api/chart/my` は認証済みユーザーの投稿・合作譜面を返す。フロントエンドからの呼び出し条件は [get_chart.py](../../rp-backend/router/web/chart/get_chart.py) と [api.ts](../../rp-frontend/src/lib/api.ts) を参照。

根拠: [get_chart.py](../../rp-backend/router/web/chart/get_chart.py)、[responses.py](../../rp-backend/schemas/responses.py)

### 2.3 譜面の投稿・編集・削除・原本ダウンロード

`POST /api/chart` は JSON 文字列の `data` と、譜面・BGM・ジャケットの3ファイルを multipart で受け付ける。タイトル等の長さ、レベル範囲、合作数、タグ数、予約投稿日時などはリクエストスキーマで検証される。譜面・BGM・ジャケットの上限はそれぞれ60 MiB、30 MiB、5 MiB。通常権限のユーザーは既存の削除されていない投稿があると投稿できず、合作・タグも指定できない。より高い権限の投稿者には非公開譜面5件、全譜面100件の制限が設定されている。

投稿時に公開状態 `PUBLIC` が指定されても、最初は `PRIVATE` として保存される。DB 登録後に画像・音源・譜面の変換タスクを個別にキューへ投入し、新しい譜面 ID を返す。`SCHEDULED` の指定はスキーマ上受け付けられる一方、投稿処理から予約処理を呼ぶコードはコメントアウトされている。

`PUT /api/chart` は既存情報の一部変更およびファイル差し替えを受け付ける。投稿者本人、合作メンバー、またはモデレーター以上が編集できる。通常権限のユーザーは譜面の公開、合作、タグを編集できない。差し替えファイルは各ファイル種別の上限で検証され、内容に変更があれば対応する変換状態フラグをリセットしてタスクを再投入する。公開状態への変更時には初回公開時刻を記録し、新着通知をバックグラウンドで送る。

予約公開は編集時にスケジューラーへジョブを登録し、予定時刻に公開状態へ変更する実装がある。ただし、リポジトリ内に `scheduler.start()` の呼び出しは見つからず、ジョブ実行が実環境で開始されるかはコード上では確認できない。参照: [edit_chart.py](../../rp-backend/router/web/chart/edit_chart.py)、[scheduler.py](../../rp-backend/utils/scheduler.py)

`DELETE /api/chart` は DB レコードを物理削除せず、`is_deleted` を true にする。投稿者本人または管理者が実行できる。S3 オブジェクト削除の処理は当該エンドポイント内でコメントアウトされている。`GET /api/chart/download` はログイン必須で、原本公開設定が公開、本人、またはモデレーター以上の場合に原本を取得できる。S3 から取得したデータを zstd 解凍してダウンロード応答にする。参照: [delete_chart.py](../../rp-backend/router/web/chart/delete_chart.py)、[download_chart.py](../../rp-backend/router/web/chart/download_chart.py)

### 2.4 ファイル変換とストレージ連携

Celery ワーカーは譜面、BGM、ジャケットを個別に処理する。譜面はレベルコンバーターの `/convert` に送信され、返された LevelData を gzip 圧縮して保存する。元譜面は zstd 圧縮して保存し、後のダウンロード時に解凍する。BGM はプレイ用 MP3 とプレビュー MP3、ジャケットは整形した PNG と背景画像に変換される。各処理の成功後、URL・ハッシュを更新し、譜面/BGM/ジャケットの完了ビットを変換状態に設定する。参照: [convert_tasks.py](../../rp-backend/utils/convert_tasks.py)、[converter.py](../../rp-backend/utils/converter.py)、[const/chart.py](../../rp-backend/const/chart.py)

レベルコンバーターへの HTTP 要求は30秒のタイムアウトを持ち、HTTP ステータスが200以外の場合は変換失敗として扱われる。Celery タスク内で例外が発生した場合、処理中セッションがあればロールバックするが、タスクから利用者へ個別の失敗応答を返す仕組みは確認できない。その場合、該当する変換完了ビットが立たない状態が残り得る。フロントエンドは詳細取得を繰り返して変換状態を確認する。参照: [converter.py](../../rp-backend/utils/converter.py)、[convert_tasks.py](../../rp-backend/utils/convert_tasks.py)、[ChartDetail.tsx](../../rp-frontend/src/components/ChartDetail.tsx)

### 2.5 認証・ユーザー情報

Web API のセッションは `HttpOnly` Cookie の JWT を利用する。アクセス Cookie の有効期間は1日、リフレッシュ Cookie は30日として設定される。`POST /api/auth/refresh` はリフレッシュ Cookie を検証し、有効な通常以上のユーザーに新しい両 Cookie を発行する。`POST /api/logout` は両 Cookie を削除する。参照: [utils/auth.py](../../rp-backend/utils/auth.py)、[auth.py](../../rp-backend/router/web/user/auth.py)

`GET /api/discord/login` は Discord OAuth URL へリダイレクトし、コールバックでギルドメンバー情報を取得する。既存ユーザーがいない場合はアカウントを作成し、Discord の管理者・モデレーターロールに応じて初期権限を設定する。既存 BAN ユーザーは拒否される。Discord 側の応答エラー処理やアカウント作成後のロール同期範囲はコード上では限定的である。参照: [discord.py](../../rp-backend/router/web/user/discord.py)

Sonolus ログインは `POST /api/sonolus/login` で Redis に期限付きの認証セッションを作り、外部ログイン URL と ID を返す。Sonolus アプリからのコールバックは署名、送信時刻（現在時刻との差が5分以内）、送信先 URL を検証する。`GET /api/auth/status` は未完了時に HTTP 202、完了時に Cookie を設定して200を返す。Sonolus アカウントのリンクはログイン中ユーザーを外部認証へ誘導し、同様の署名等を検証したコールバックでユーザーに Sonolus ID 等を保存する。参照: [sonolus.py](../../rp-backend/router/web/user/sonolus.py)、[auth.py](../../rp-backend/router/web/user/auth.py)、[utils/auth.py](../../rp-backend/utils/auth.py)

`GET /api/user` はユーザー情報を返し、本人またはモデレーターにだけ権限情報、モデレーターにだけ警告数を含める。`GET /api/users` は名前・権限による最大20件の検索を提供し、BAN 権限の検索はモデレーター以上に制限する。`PUT /api/user` は本人のプロフィール編集、または権限条件を満たすモデレーターによる他者編集を受け付ける。プロフィールは200文字以内、アイコンは10 MiB 以下で、画像処理と保存はバックグラウンドで行う。参照: [get_user.py](../../rp-backend/router/web/user/get_user.py)、[edit_user.py](../../rp-backend/router/web/user/edit_user.py)、[schemas/requests.py](../../rp-backend/schemas/requests.py)

### 2.6 譜面制作者の承認

通常権限のユーザーは自分の譜面を対象に申請でき、未完了申請がある場合は新しい申請を作成できない。申請後、通知用 URL を含む Discord 通知がバックグラウンド処理に渡される。本人は自分の申請を一覧・詳細で確認でき、認定制作者以上は全体の未完了申請を確認できる。モデレーター以上は完了済み申請を全体一覧で確認できる。完了済み一覧は `GET /api/auth/charter/requests/completed` が返し、モデレーター未満のアクセスは拒否する。

認定制作者以上は各申請に一度だけ承認または却下を登録できる。却下2件で申請を終了し、承認2件で申請者の権限を制作者に変更して終了する。承認時には Discord の制作者ロールも付与し、ロール付与が HTTP 204 以外の場合は DB 更新をロールバックしてサーバーエラーにする。完了済み申請一覧は作成日時の降順で返す。審査者本人は申請が未完了の場合に限り、自身の審査結果を `DELETE /api/auth/charter/approval?approval_id=...` で取り消せる。他者の審査結果、または完了済み申請の審査結果は削除できない。参照: [auth_charter.py](../../rp-backend/router/web/user/auth_charter.py)、[const/user.py](../../rp-backend/const/user.py)

### 2.7 Sonolus サーバー API

Sonolus ライブラリにサーバー情報、認証、リスト、詳細、検索フォーム等の処理を登録する。サーバー情報ではレベル、スキン、背景、エフェクト、パーティクル、エンジン、ユーザー等の項目を案内する。アイテム情報は `SOURCE_URL` を Sonolus サーバーのアドレスとして使用する。各 API の最終 URL パスやプロトコル変換の細部は `sonolus-fastapi` ライブラリにも依存するため、リポジトリ内コードだけでは全てを確認できない。参照: [router/sonolus/index.py](../../rp-backend/router/sonolus/index.py)、[router/sonolus/__init__.py](../../rp-backend/router/sonolus/__init__.py)、[server_info.py](../../rp-backend/router/sonolus/server_info.py)

レベル一覧は論理削除されておらず、変換が完了し、公開状態である譜面を対象とする。Sonolus 用検索フォームの値により、キーワード・タイトル・作曲者・ボーカル・作者・ユーザーハンドル・レベル・ジャンル・R18 を絞り込み、20件単位でページングする。R18 指定がない場合は安全区分のみ返す。詳細からは「いいね」状態に応じた操作を返し、操作の実行には Sonolus セッションを要求する。参照: [level_list.py](../../rp-backend/router/sonolus/list/level_list.py)、[level_detail.py](../../rp-backend/router/sonolus/detail/level_detail.py)、[utils/sonolus/level.py](../../rp-backend/utils/sonolus/level.py)

### 2.8 タグ、お知らせ、運営情報、OGP

`GET /api/chart/tag` はタグ一覧を返す。タグ追加・削除はモデレーター以上に限定され、削除時には譜面に設定された当該タグ関連も削除する。参照: [tag.py](../../rp-backend/router/web/chart/tag.py)

`GET /api/announce` はピン留めされたお知らせを更新日時の降順で返し、Redis キャッシュを利用する。この GET 処理自体にログイン依存はない。作成・編集・削除はモデレーター以上に限定され、画像は非同期変換タスクに渡される。参照: [announce.py](../../rp-backend/router/web/announce.py)

`GET /api/server/info` はモデレーター以上に公開・非公開・論理削除済み譜面の件数を返す。`GET /api/ogp` と `GET /api/ogp/chart/{chart_id}` はトップページまたは譜面の共有用メタデータを含む HTML を返す。存在しない譜面では「見つからない」説明の OGP を返す。参照: [chart.py](../../rp-backend/router/web/server_info/chart.py)、[ogp.py](../../rp-backend/router/web/ogp.py)

## 3. バージョン履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| 1.0 | 2026-10-22 | コードベースを調査し、現在確認できるバックエンド仕様を初版として記録。 |
