# ReLoad Analytics

ReLoad 運営サイトのアクセス・SEO・収益を横断で確認する静的ダッシュボード。
Next.js Static Export で GitHub Pages に配信する。ブラウザから Google API は呼ばない。

## 画面

| パス            | 内容                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| `/`             | 全サイト KPI・トラフィック推移・サイト別ランキング・伸びている / 注意が必要なサイト |
| `/sites/[site]` | サイト別 KPI・指標推移・期間比較・SEO 流入・人気記事                                |
| `/seo`          | Search Console KPI・SEO Opportunity・サイト別 / キーワード別ランキング              |
| `/articles`     | 記事ランキング（PV / 急上昇 / 下落 / Organic）                                      |

期間（7 / 30 / 90 日）はヘッダーで切り替え、常に直前の同じ長さの期間と比較する。

## データ

UI はビルド時に `data/*.json` を読むだけ。

| ファイル        | 取得元         | 内容                                                         |
| --------------- | -------------- | ------------------------------------------------------------ |
| `sites.json`    | 手動           | サイト一覧と API 設定                                        |
| `traffic.json`  | GA4            | サイト別日次 PV / Users / Sessions / Organic Users（180 日） |
| `articles.json` | GA4            | 記事別の期間集計（今期間 / 前期間）                          |
| `seo.json`      | Search Console | サイト別・キーワード別の期間集計                             |
| `revenue.json`  | AdSense        | サイト別日次収益（JPY）                                      |

初期状態はダミーデータ。

### サイト追加

`data/sites.json` に追記するだけ（コード変更不要）。

```json
{
  "id": "akiba",
  "name": "Akiba Live",
  "url": "https://akiba.reload.co.jp/",
  "ga4": "123456789",
  "gsc": "sc-domain:akiba.reload.co.jp"
}
```

- `ga4`: GA4 プロパティ ID（数字）
- `gsc`: Search Console のプロパティ（ドメインプロパティは `sc-domain:`、URL プレフィックスは `https://.../`）
- AdSense はアカウント単位で取得し、`url` のホスト名でサイトに振り分ける

未設定の取得元はスキップされ、既存の JSON がそのまま残る。

### 自動更新（GitHub Actions）

`.github/workflows/update-data.yml` が毎日 06:00 JST に `scripts/fetch-google-data.ts` を実行し、
`data/` に変更があればコミットしてデプロイする。手動実行は Actions タブの **Run workflow**。

リポジトリの **Settings → Secrets and variables → Actions** に登録：

| Secret                 | 内容                                       |
| ---------------------- | ------------------------------------------ |
| `GOOGLE_CLIENT_ID`     | OAuth クライアント ID                      |
| `GOOGLE_CLIENT_SECRET` | OAuth クライアントシークレット             |
| `GOOGLE_REFRESH_TOKEN` | 下記スコープを許可したリフレッシュトークン |
| `ADSENSE_ACCOUNT`      | `accounts/pub-XXXXXXXXXXXXXXXX`（任意）    |

認証は OAuth ユーザー 1 つにまとめている（AdSense API はサービスアカウント非対応のため）。

1. Google Cloud で Google Analytics Data API / Search Console API / AdSense Management API を有効化
2. OAuth クライアント（ウェブアプリケーション）を作成。リダイレクト URI に `https://developers.google.com/oauthplayground` を追加
3. OAuth 同意画面は **内部**（Workspace）か **本番** にする。**テスト** のままだとリフレッシュトークンが 7 日で失効する
4. [OAuth Playground](https://developers.google.com/oauthplayground) の設定で自分のクライアント ID / シークレットを使い、以下のスコープでトークンを発行
   - `https://www.googleapis.com/auth/analytics.readonly`
   - `https://www.googleapis.com/auth/webmasters.readonly`
   - `https://www.googleapis.com/auth/adsense.readonly`
5. 認可したユーザーが各 GA4 プロパティ・Search Console・AdSense の閲覧権限を持っていること

ローカル実行：

```bash
GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... GOOGLE_REFRESH_TOKEN=... pnpm fetch-data
```

## 開発

```bash
pnpm install
pnpm dev
```

| コマンド                                     | 説明                         |
| -------------------------------------------- | ---------------------------- |
| `pnpm dev`                                   | 開発サーバー                 |
| `pnpm build`                                 | 静的ビルド（`out/`）         |
| `pnpm fetch-data`                            | Google API からデータ取得    |
| `pnpm test` / `pnpm lint` / `pnpm typecheck` | テスト / リント / 型チェック |

本番ビルドは `basePath: /dashboard`（`next.config.js`）。GitHub Pages の Source は「GitHub Actions」に設定する。
