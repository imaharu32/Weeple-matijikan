# Weeple 待ち時間管理

ボドゲカフェ Weeple の待ち列・店内の座席・入店見込み時間を管理する Web アプリです。
React + TypeScript + Vite で作っていて、データは Firebase（Firestore・匿名認証）に保存しています。

- 本番: https://weeple-matijikan.vercel.app （Vercel でホスティング。ビルド設定は `vercel.json`）
- Node.js 26（LTS）を使います（`package.json` の `engines` で固定。Vercel もこれに従います）

## 主な機能

- 待ち列への追加・編集・削除と、組ごとの入店見込み時間の表示
- 座席（6人テーブル × 6 = 36席）を選んで入店、退店で履歴に移動
- 人数ごとに使う席数のルール設定（Firestore に保存され、全端末で共有）
- 日付ごとの来店履歴（直近30日分を表示）
- `/wait_time`：2人で並んだ場合の待ち時間だけを表示するページ

## ローカルで動かす

1. 依存をインストール

   ```bash
   npm ci
   ```

2. `.env` を作って Firebase の設定を入れる（`.env` は git に入れない）

   ```
   REACT_APP_API_KEY=
   REACT_APP_AUTH_DOMAIN=
   REACT_APP_PROJECT_ID=
   REACT_APP_STORAGE_BUCKET=
   REACT_APP_MESSAGING_SENDER_ID=
   REACT_APP_APP_ID=
   ```

   Vercel にも同じ環境変数を設定しておく必要があります。
   CRA 時代の名前（`REACT_APP_*`）のまま使えるよう、`vite.config.ts` の `envPrefix` で読み込んでいます。コードからは `import.meta.env.REACT_APP_*` で参照します。

3. 開発サーバーを起動（http://localhost:3000）

   ```bash
   npm run dev
   ```

### 開発中は本番のお店のデータを触らない

店舗は `REACT_APP_SHOP_ID` で切り替わります（未設定なら本番の `default_shop`）。
`npm run dev` のときは `.env.development` によって `dev_shop` が使われるので、開発中の操作が本番の待ち列に入ることはありません。

Vercel のプレビュー環境（ブランチの push で作られる URL）でも同じようにするには、Vercel の環境変数で **Preview** にだけ `REACT_APP_SHOP_ID=dev_shop` を設定してください。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev`（`npm start` も同じ） | 開発サーバー |
| `npm test` | テスト（Vitest、ウォッチモード）。1回だけ流すなら `npx vitest run` |
| `npm run lint` | ESLint |
| `npm run build` | 型チェック + 本番ビルド（`dist/` に出力） |
| `npm run preview` | ビルド結果をローカルで確認 |

## ディレクトリ

```
src/
  App.tsx                 画面の組み立て（UIの状態だけを持つ）
  components/             画面の部品（待ち列、店内リスト、座席図、各モーダル）
  hooks/useShopData.ts    店舗データの購読と更新（待ち列・店内・履歴・座席ルール）
  hooks/                  そのほか、モーダル・複数選択・エラー表示用のフック
  services/               Firestore の読み書き
  utils/                  待ち時間の見積もり、座席、日付処理
  constants.ts            店舗ID・コース・座席数・履歴の日数などの定数
  firebase.ts             Firebase の初期化と匿名ログイン
firestore.rules           Firestore セキュリティルール（コンソールへは手動で反映）
.github/workflows/ci.yml  push / PR ごとに lint・テスト・ビルドを確認
```

## Firestore のデータ構成

```
shops/{shopId}
  queue/{id}      待ち列
  inside/{id}     店内にいる組（座席情報を含む）
  history/{id}    退店した組（exitAt で直近30日分だけ読み込む）
  meta/settings   設定（seatsRangePerPartySize: 人数ごとの席数ルール）
```

## 注意

- Firebase の設定値はビルドした JS に埋め込まれて誰でも見られるので、データの保護は `firestore.rules` が頼りです。
- `firestore.rules` はリポジトリからは自動で反映されません。変更したら Firebase コンソールにも反映し、両者がずれないようにしてください。
