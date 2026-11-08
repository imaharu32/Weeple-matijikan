# Weeple 待ち時間管理

ボドゲカフェ Weeple の待ち列・店内の座席・入店見込み時間を管理する Web アプリです。
React + TypeScript + Vite で作っていて、データは Firebase（Firestore・匿名認証）に保存しています。

- 本番: https://weeple-matijikan.vercel.app （Vercel でホスティング。ビルド設定は `vercel.json`）
- Node.js 26（LTS）を使います（`package.json` の `engines` で固定。Vercel もこれに従います）

## 主な機能

- 待ち列への追加・編集・削除と、組ごとの入店見込み時間の表示
- 入店時の席選び（人数分のおすすめの席を自動で選択。席は何席でも選べる）
- 座席図（6人テーブル × 6 = 36席。組ごとに色分けし、席をクリックするとその組の詳細を開く）
- 店内の組の延長・人数やコースの変更・席の変更・退店
- 日付ごとの退店履歴（直近30日分を表示）
- `/wait_time`：お客さん向けに、2人で並んだ場合の待ち時間だけを表示するページ

待ち時間は次のルールで見積もります（`src/utils/waitingTimeEstimator.ts`）。

- 1人1席として数える（全席数より多い組は全席を使う）
- 店内の組は退店予定時刻に席を空ける。予定を過ぎた組の席は、もう空いているものとして扱う
- 待ち列は並んだ順に案内する
- 待ち列の組は、入店してから「一番短いコース＋余裕15分」だけ席を使う

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

### デモモード（Firebase を使わずに画面を確認する）

`npm run dev` で http://localhost:3000/?demo を開くと、サンプルデータ（待ち列4組・店内5組・履歴）で動きます。
Firebase にはつながらず、操作はメモリ上だけで行われます（リロードすると元に戻る）。UI の確認や、新しいスタッフの練習に使えます。
本番ビルドでは `?demo` を付けても無効です（`src/dev/useDemoShopData.ts`）。

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
  components/ui/          共通の部品（Modal・Panel・NumberStepper）
  hooks/useShopData.ts    店舗データの購読と更新（待ち列・店内・履歴）
  hooks/                  そのほか、お知らせ表示用のフック
  dev/                    開発時だけ使うもの（デモモードのサンプルデータ）
  services/               Firestore の読み書き
  utils/                  待ち時間の見積もり、座席、日付処理
  styles/                 全体共通の CSS（tokens.css・base.css）
  constants.ts            店舗ID・コース・座席数・履歴の日数などの定数
  firebase.ts             Firebase の初期化と匿名ログイン
firestore.rules           Firestore セキュリティルール（コンソールへは手動で反映）
.github/workflows/ci.yml  push / PR ごとに lint・テスト・ビルドを確認
```

## CSS の書き方

CSS Modules ＋ 共通のデザイン変数で書きます。

```
src/styles/tokens.css           デザイン変数（色・余白・角丸・影・文字サイズ）とブレークポイントの一覧
src/styles/base.css             全体共通（リセット、ボタン .btn、入力欄 .input、ラベル .chip など）
src/App.module.css              画面全体のレイアウト
src/components/Xxx.module.css   その部品専用のスタイル
src/components/ui/              共通の部品（モーダル・見出し付きの枠・数値入力）
```

- 部品のスタイルは、その部品と同じ名前の `Xxx.module.css` に書き、`import styles from './Xxx.module.css'` で `className={styles.fooBar}` として使う
  - クラス名は camelCase（`.fooBar`）。ほかの部品とは名前がぶつからない
- 複数の部品で使う共通クラスだけを `base.css` に置く。こちらは kebab-case の文字列で使う
  - ボタン: `className="btn btn-primary"`（ほかに `btn-secondary` / `btn-danger` / `btn-ghost`、大きさ `btn-sm` / `btn-lg`）
  - 入力欄: `input` / `select` / `textarea`、ラベル付きは `field` ＋ `field-label`
  - 状態のラベル: `chip`（`chip-success` / `chip-warning` / `chip-danger` / `chip-primary`）
- モーダルは `components/ui/Modal` を使う（Esc・背景クリックで閉じる。ボタンは `footer` に入れると下に固定される）
- 色・余白・角丸・影・文字サイズは直書きせず、`tokens.css` の変数（`var(--color-primary)`、`var(--space-4)` など）を使う。足りなければ変数を追加する
- インライン `style={{ ... }}` は、データで変わる値（組ごとの色など）だけに使う
- 画面幅の切り替えは 900 / 1280 / 1440px にそろえる（`tokens.css` に一覧あり）

## Firestore のデータ構成

```
shops/{shopId}
  queue/{id}      待ち列
  inside/{id}     店内にいる組（座席情報を含む）
  history/{id}    退店した組（exitAt で直近30日分だけ読み込む）
```

`meta/settings` は以前の「人数ごとの席数の設定」の保存先です。今は使っていないので、残っていても問題ありません。

## 注意

- Firebase の設定値はビルドした JS に埋め込まれて誰でも見られるので、データの保護は `firestore.rules` が頼りです。
- `firestore.rules` はリポジトリからは自動で反映されません。変更したら Firebase コンソールにも反映し、両者がずれないようにしてください。
