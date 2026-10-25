# フロントエンド仕様調査書

## 0. 概要

`rp-frontend/` は React と TypeScript で構成された Rhythm Prism のブラウザー向け SPA である。利用者は譜面の閲覧・検索、プロフィール閲覧、ログイン、譜面投稿・編集、譜面制作者申請を行える。モデレーター以上にはお知らせ・ユーザー管理等の画面が提供される。データの取得・更新は主に [rp-backend](../../rp-backend/) の `/api` Web API に対して行い、譜面詳細から Sonolus で開くリンクも生成する。

画面遷移は React Router で管理し、認証状態はアプリ起動時にバックエンドから復元する。認証トークンは JavaScript から読み取らず、Cookie をリクエストに同梱する。開発時は Vite が `/api` と `/sonolus` をバックエンドへプロキシする。ビルド成果物は静的ファイルとして配信される。参照: [App.tsx](../../rp-frontend/src/App.tsx)、[AuthProvider.tsx](../../rp-frontend/src/auth/AuthProvider.tsx)、[vite.config.ts](../../rp-frontend/vite.config.ts)、[nginx.conf](../../rp-frontend/nginx.conf)

## 1. 機能一覧

| 機能 | 概要 | 主な根拠 |
|---|---|---|
| ホーム・譜面検索・詳細 | 新着譜面、お知らせスライダー、条件検索、譜面詳細を表示する。 | [App.tsx](../../rp-frontend/src/App.tsx)、[SearchPage.tsx](../../rp-frontend/src/components/SearchPage.tsx)、[ChartDetail.tsx](../../rp-frontend/src/components/ChartDetail.tsx) |
| 認証とセッション | Discord または Sonolus でログインし、Cookie セッションを復元・更新・終了する。 | [LoginModal.tsx](../../rp-frontend/src/components/LoginModal.tsx)、[auth.ts](../../rp-frontend/src/lib/auth.ts)、[http.ts](../../rp-frontend/src/lib/http.ts) |
| 譜面投稿・編集・管理 | 譜面情報とファイルを送信し、投稿者等が情報やファイルを編集する。 | [SubmitChart.tsx](../../rp-frontend/src/components/SubmitChart.tsx)、[EditChart.tsx](../../rp-frontend/src/components/EditChart.tsx)、[api.ts](../../rp-frontend/src/lib/api.ts) |
| プロフィール・自分の譜面 | プロフィール、公開譜面、本人向けの非公開譜面を表示・編集する。 | [UserProfile.tsx](../../rp-frontend/src/components/UserProfile.tsx)、[MyCharts.tsx](../../rp-frontend/src/components/MyCharts.tsx)、[EditProfile.tsx](../../rp-frontend/src/components/EditProfile.tsx) |
| 制作者認定申請・審査 | 制作者申請状況の閲覧・申請、認定制作者向け審査、およびモデレーター以上向け完了済み申請の閲覧を行う。 | [CharterApply.tsx](../../rp-frontend/src/components/CharterApply.tsx)、[CharterRequests.tsx](../../rp-frontend/src/components/CharterRequests.tsx)、[CharterPendingRequests.tsx](../../rp-frontend/src/components/CharterPendingRequests.tsx)、[CharterPastRequests.tsx](../../rp-frontend/src/components/CharterPastRequests.tsx)、[CharterStatus.tsx](../../rp-frontend/src/components/CharterStatus.tsx) |
| 運営画面 | お知らせ管理、ユーザー管理、サーバー統計を表示・編集する。 | [AnnouncementList.tsx](../../rp-frontend/src/components/AnnouncementList.tsx)、[ModerationUsers.tsx](../../rp-frontend/src/components/ModerationUsers.tsx)、[ServerInfo.tsx](../../rp-frontend/src/components/ServerInfo.tsx) |
| 規約・共通 UI | 利用規約画面、共通ヘッダー・フッター等を表示する。 | [Terms.tsx](../../rp-frontend/src/components/Terms.tsx)、[Header.tsx](../../rp-frontend/src/components/Header.tsx)、[Footer.tsx](../../rp-frontend/src/components/Footer.tsx) |

## 2. 機能詳細

### 2.1 画面遷移とアクセス制御

アプリケーションは `/` の新着一覧、`/search` の検索、`/chart/:chartId` の譜面詳細、`/chart/:chartId/edit` の編集、`/user/:userId` のプロフィール、`/submit` の投稿、プロフィール編集、自分の譜面一覧、制作者申請・審査、お知らせ管理、ユーザー管理、サーバー統計、`/terms` の規約画面を提供する。未定義のパスは `/` へリダイレクトする。参照: [App.tsx](../../rp-frontend/src/App.tsx)

ログイン必須、通常ユーザー限定、認定制作者以上、モデレーター以上といった画面単位の表示制御を行う。未ログインでログイン必須画面に入るとホームへ戻し、ログインモーダルを開く。これらはフロントエンド上の表示・遷移制御であり、実際の API 認可はバックエンド側でも行われる。権限値は [constants.ts](../../rp-frontend/src/lib/constants.ts) に定義される。

### 2.2 ホーム、お知らせ、検索、譜面詳細

ホームでは新着譜面を検索結果として表示し、お知らせ API から取得したスライドを表示する。お知らせ取得に失敗した場合、スライダーは表示されない。スライドは複数ある場合に5秒間隔で自動送りされ、操作中は一時停止する。参照: [App.tsx](../../rp-frontend/src/App.tsx)、[Slider.tsx](../../rp-frontend/src/components/Slider.tsx)

検索画面では、キーワード、公開状態に関係する絞り込み、レベル範囲、難易度、ジャンル、R18、合作、並び順等を入力し、検索操作後に API を呼ぶ。結果はページングし、検索結果から譜面詳細へ移動できる。通信中は検索を重複送信しない。フィルター条件と検索 API のパラメーター化は [SearchPage.tsx](../../rp-frontend/src/components/SearchPage.tsx)、[useChartSearch.ts](../../rp-frontend/src/hooks/useChartSearch.ts)、[api.ts](../../rp-frontend/src/lib/api.ts) を参照。

譜面詳細ではジャケット、譜面情報、作者・合作ユーザー等を表示し、Sonolus で開くリンクを組み立てる。変換状態が完了していない間は3秒間隔で詳細を再取得し、変換中であることを表示する。譜面ファイルのダウンロード、編集リンクは画面上のユーザー状態に応じて表示され、実際の取得権限はバックエンド API が判断する。参照: [ChartDetail.tsx](../../rp-frontend/src/components/ChartDetail.tsx)、[constants.ts](../../rp-frontend/src/lib/constants.ts)

### 2.3 ログインとセッション維持

ログインモーダルには Discord ログインと Sonolus ログインがある。Discord はバックエンドの OAuth URL に遷移する。Sonolus はログインセッションを作成し、返された URL を開く・コピーする操作を提供し、認証状態を2.5秒ごとに確認する。完了するとユーザー情報を再取得してモーダルを閉じる。参照: [LoginModal.tsx](../../rp-frontend/src/components/LoginModal.tsx)、[auth.ts](../../rp-frontend/src/lib/auth.ts)

起動時に `GET /api/login` でログインユーザーを復元する。Cookie は `credentials: "include"` で送信される。Cookie 認証 API が401を返した場合、`POST /api/auth/refresh` を一度実行して元の要求を再試行する。再試行後も401の場合は認証期限切れイベントを発生させ、画面上の認証ユーザーを消去する。ログアウトではバックエンドへ Cookie 削除を依頼してからローカル状態を未ログインにする。初期ユーザー取得とログアウト処理はネットワーク例外を捕捉して未ログイン状態にする実装である。参照: [http.ts](../../rp-frontend/src/lib/http.ts)、[AuthProvider.tsx](../../rp-frontend/src/auth/AuthProvider.tsx)

### 2.4 譜面投稿・編集・削除

投稿画面ではタイトル、作曲者、ボーカル、表示名、説明、ジャンル、難易度、レベル、R18、合作、原本譜面ファイル公開設定、音源プレビュー開始位置を入力し、譜面・BGM・ジャケットを選択して multipart で送信する。主な入力制限は、タイトル等50文字、説明200文字、レベル0〜50、合作20人、各ファイル上限は [constants.ts](../../rp-frontend/src/lib/constants.ts) に定義される。新規投稿の公開状態は常に非公開であり、投稿後は自分のプロフィールへ移動する。タグ UI は `SHOW_TAGS` が false のため非表示で、コード内には仮のタグ候補が残っている。参照: [SubmitChart.tsx](../../rp-frontend/src/components/SubmitChart.tsx)、[constants.ts](../../rp-frontend/src/lib/constants.ts)

編集画面は既存情報を読み込み、テキスト等の更新と譜面・BGM・ジャケットの任意差し替えを行う。公開状態の選択肢は非公開・公開の2種類で、予約投稿状態は画面上で非公開に正規化される。タグ編集 UI は提供されない。譜面削除は確認操作の後に API を呼び、成功時は画面遷移する。編集権限や削除権限はバックエンドでも検証される。参照: [EditChart.tsx](../../rp-frontend/src/components/EditChart.tsx)、[api.ts](../../rp-frontend/src/lib/api.ts)

### 2.5 プロフィールと自分の譜面

プロフィール画面はユーザー情報、自己紹介、Discord/Sonolus 表示名、公開譜面を表示する。本人のプロフィールでは編集操作と非公開譜面一覧を追加し、R18 譜面も検索対象に含める。他ユーザーのプロフィールには本人向け非公開譜面を表示しない。プロフィール編集・アイコン差し替えは専用画面から API へ送信する。参照: [UserProfile.tsx](../../rp-frontend/src/components/UserProfile.tsx)、[MyCharts.tsx](../../rp-frontend/src/components/MyCharts.tsx)、[EditProfile.tsx](../../rp-frontend/src/components/EditProfile.tsx)

### 2.6 制作者認定申請と審査

通常権限のログインユーザーには申請画面を表示し、選択した自身の譜面を使って申請する。申請者は自身の申請一覧と申請ごとの審査状態・理由を確認できる。認定制作者以上の画面では未完了申請一覧を表示し、申請詳細から承認または却下を選ぶと確認ダイアログで操作内容を確認してから送信する。モデレーター以上はメニューの「過去の申請」から全体の完了済み申請一覧を開き、一覧から各申請の詳細・審査履歴を確認できる。フロントエンドはページ導線を権限に応じて切り替え、申請状態・審査権限の最終判定はバックエンドが行う。参照: [App.tsx](../../rp-frontend/src/App.tsx)、[Header.tsx](../../rp-frontend/src/components/Header.tsx)、[CharterApply.tsx](../../rp-frontend/src/components/CharterApply.tsx)、[CharterStatus.tsx](../../rp-frontend/src/components/CharterStatus.tsx)、[CharterPendingRequests.tsx](../../rp-frontend/src/components/CharterPendingRequests.tsx)、[CharterPastRequests.tsx](../../rp-frontend/src/components/CharterPastRequests.tsx)、[api.ts](../../rp-frontend/src/lib/api.ts)

### 2.7 運営画面、お知らせ、規約

モデレーター以上にはお知らせの一覧・作成・編集・削除、ユーザー検索・編集、サーバー譜面数の表示を提供する。画面へのアクセスはフロントエンドでも権限により制限される。ホームのお知らせスライダーでもお知らせ情報を利用する。参照: [App.tsx](../../rp-frontend/src/App.tsx)、[AnnouncementList.tsx](../../rp-frontend/src/components/AnnouncementList.tsx)、[EditAnnouncement.tsx](../../rp-frontend/src/components/EditAnnouncement.tsx)、[ModerationUsers.tsx](../../rp-frontend/src/components/ModerationUsers.tsx)、[ServerInfo.tsx](../../rp-frontend/src/components/ServerInfo.tsx)、[Slider.tsx](../../rp-frontend/src/components/Slider.tsx)

利用規約は静的な画面として表示され、規約本文を API から取得する処理は確認できない。参照: [Terms.tsx](../../rp-frontend/src/components/Terms.tsx)

### 2.8 API 接続と配信構成

API ベース URL は `VITE_API_BASE` があればその値、なければ空文字列を使用する。開発用 Vite サーバーは `/api` と `/sonolus` を `VITE_PROXY_TARGET` の宛先へ転送し、未設定時の宛先は `http://localhost:5001` である。Nginx 設定はビルド済み SPA の静的配信と未知パスの `index.html` フォールバックを行い、API/Sonolus の転送先はトップレベルのリバースプロキシに委ねる旨を記載している。実際の本番リバースプロキシ設定・ドメインはこの対象フォルダだけでは確認できない。参照: [lib/api.ts](../../rp-frontend/src/lib/api.ts)、[lib/http.ts](../../rp-frontend/src/lib/http.ts)、[vite.config.ts](../../rp-frontend/vite.config.ts)、[nginx.conf](../../rp-frontend/nginx.conf)

`package.json` には開発、ビルド、lint、preview のスクリプトが定義されている。自動テスト実行スクリプトは確認できない。参照: [package.json](../../rp-frontend/package.json)

## 3. バージョン履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| 1.0 | 2026-10-22 | コードベースを調査し、現在確認できるフロントエンド仕様を初版として記録。 |
