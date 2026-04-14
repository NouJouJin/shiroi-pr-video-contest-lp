# 白井市PR動画コンテスト LP

Metagri研究所 presents 白井市PR動画コンテストの公式ランディングページと作品ギャラリー。

## 📁 構成

```
.
├── SHIROI.html          コンテストLP本体（既存）
├── SHIROI.CSS           LPのスタイル（既存）
├── SHIROI.js            LPの花びらアニメーション等（既存）
│
├── gallery.html         作品ギャラリーページ
├── css/
│   └── gallery.css      ギャラリー専用スタイル
├── js/
│   └── gallery.js       ギャラリー描画 / モーダル / いいね処理
├── data/
│   └── entries.json     応募作品データ（手動更新）
├── api/
│   └── like.js          Vercel Serverless Function（いいね機能）
│
├── package.json
├── vercel.json          Vercelルーティング・キャッシュ設定
└── .gitignore
```

## 🎯 主な機能

### コンテストLP（`SHIROI.html`）
- ヒーロー / 趣旨 / 賞品 / テーマ / 応募要項 / FAQ / 応募フォーム（Airtable埋め込み）

### 作品ギャラリー（`gallery.html`）
- **YouTubeサムネイル + タイトル + 制作者名のグリッド表示**
- **新着順ソート**（`submittedAt` 降順）
- **カードクリックでモーダル展開**
  - YouTube動画埋め込み（autoplay）
  - クリエイターの想い（メッセージ本文）
  - いいねボタン
- **いいね機能**
  - Vercel KV（Upstash Redis）でカウントを永続化
  - localStorageによる多重投票防止（ベストエフォート）
  - APIエラー時もUIは壊れないフォールバック
- **キーボード操作対応**（Tab → Enter で再生、Esc で閉じる）
- **レスポンシブ**（SP時はモーダルがフルスクリーン化）
- **受賞ページ導線**（ヘッダーに Coming Soon プレースホルダー）

---

## 🚀 セットアップ手順

### 前提条件

| ツール | バージョン | 用途 |
|---|---|---|
| Node.js | 18.x 以上 | パッケージ管理・ローカル開発 |
| npm | 9.x 以上 | （Node.js付属） |
| Git | 任意 | バージョン管理 |
| Vercel CLI | 最新 | デプロイ・ローカルAPI実行 |
| Vercelアカウント | — | デプロイ先 |

### 1. リポジトリの取得

```bash
git clone <このリポジトリのURL>
cd shiroi-pr-video-contest-lp
```

### 2. 依存パッケージのインストール

```bash
npm install
```

これで `@vercel/kv` がインストールされます。

### 3. Vercel CLI のインストール（未導入の場合）

```bash
npm install -g vercel
```

### 4. Vercelプロジェクトとのリンク

初回のみ実行してください。

```bash
vercel login          # ブラウザでログイン
vercel link           # 既存プロジェクトと紐付け or 新規作成
```

ウィザードに従い、以下を選択:
- Set up and deploy: **Y**
- Which scope?: 自分のアカウント or チーム
- Link to existing project?: **N**（初回） / **Y**（既存プロジェクトに紐付ける場合）
- What's your project's name?: 任意（例: `shiroi-pr-video-contest-lp`）
- In which directory is your code located?: **`./`**

### 5. Vercel KV（Upstash Redis）の有効化

いいね機能のストレージとして必須です。

1. [Vercelダッシュボード](https://vercel.com/dashboard)を開く
2. 該当プロジェクトを選択
3. **Storage** タブを開く
4. **Create Database** → **Marketplace Database Providers** → **Upstash** → **Redis (Serverless)** を選択
5. リージョンは **Tokyo (ap-northeast-1)** または近いリージョンを選択
6. 作成完了後、**Connect Project** で当該プロジェクトに接続
7. 以下の環境変数が自動で注入されます（手動設定不要）:
   - `KV_URL`
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
   - `KV_REST_API_READ_ONLY_TOKEN`

> **補足**: Vercelの無料プラン (Hobby) でも Upstash Redis の無料枠が利用できます。

### 6. ローカル環境変数の取得（ローカル開発する場合）

```bash
vercel env pull .env.local
```

`.env.local` にKV接続情報が書き出されます（`.gitignore` 済み）。

### 7. ローカル開発サーバーの起動

```bash
vercel dev
```

`http://localhost:3000` で起動します。

| URL | 内容 |
|---|---|
| `http://localhost:3000/` | コンテストLP（`SHIROI.html`） |
| `http://localhost:3000/gallery.html` | 作品ギャラリー |
| `http://localhost:3000/api/like` (GET) | いいね数一覧（JSON） |
| `http://localhost:3000/api/like` (POST) | いいね追加（JSON） |

### 8. 本番デプロイ

```bash
vercel --prod
```

完了するとデプロイURLが表示されます。Vercelダッシュボードからカスタムドメインの設定も可能です。

---

## 📝 作品の追加・編集

応募作品は [`data/entries.json`](data/entries.json) で管理しています。

### 追加例

```json
{
  "entries": [
    {
      "id": "004",
      "title": "梨の花咲く丘で",
      "creator": "白井 太郎",
      "youtubeId": "abcDEF12345",
      "message": "白井に住む祖父が大切に育ててきた梨畑。\nその四季を孫として記録したくて、AIと実写を組み合わせて作品にしました。\n見てくれた人が、白井を好きになってくれたら嬉しいです。",
      "submittedAt": "2026-04-30"
    }
  ]
}
```

### フィールド仕様

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| `id` | string | ✅ | ユニークID。半角英数・ハイフン・アンダースコア（1〜64文字）。**KVのキーになるため後から変更しないこと**。 |
| `title` | string | ✅ | 作品タイトル。 |
| `creator` | string | ✅ | 制作者名（個人名・チーム名）。 |
| `youtubeId` | string | ✅ | YouTube動画IDのみ。`https://www.youtube.com/watch?v=XXXXX` の `XXXXX` 部分。 |
| `message` | string | ✅ | クリエイターの想い。`\n` で改行可。 |
| `submittedAt` | string | ✅ | 応募日（ISO形式 `YYYY-MM-DD`）。並び順に使用。 |

### 反映フロー

1. `data/entries.json` を編集
2. `git commit` & `git push`
3. Vercelが自動で再デプロイ → 数十秒で本番反映

> JSONはCDNキャッシュ60秒（`vercel.json` で設定）。即時確認したい場合はブラウザのスーパーリロード（Ctrl/Cmd + Shift + R）を行ってください。

---

## 🔧 API仕様（`/api/like`）

### `GET /api/like`

全作品のいいね数を返却します。ギャラリー読み込み時に1回呼ばれます。

**レスポンス**
```json
{
  "counts": {
    "001": 12,
    "002": 5,
    "003": 27
  }
}
```

### `POST /api/like`

指定IDのいいね数を+1します。

**リクエスト**
```json
{ "id": "001" }
```

**レスポンス**
```json
{ "id": "001", "count": 13 }
```

**バリデーション**
- `id` は半角英数・ハイフン・アンダースコアのみ（1〜64文字）
- 不正な`id`は `400` を返却

### ストレージ構造（Vercel KV）

| キー | 型 | 説明 |
|---|---|---|
| `shiroi:like:<id>` | integer | 各作品のいいねカウント |
| `shiroi:like:ids` | set | 既知の作品ID一覧（GET時に全件取得用） |

---

## 🛡️ いいね機能の制限事項

ログイン不要を優先しているため、以下の割り切りがあります:

- **localStorage で多重投票防止** → 同一ブラウザでは押せないが、シークレットモード/別ブラウザでは再投票可能
- **IPベースの厳密なレート制限なし** → 必要になったら `/api/like` 内に Vercel KV ベースで追加実装可能
- **不正対策よりUX優先** の設計

将来、より厳密な投票機能が必要になった場合は、認証連携（メールマジックリンク等）への切り替えを推奨します。

---

## 🗺️ 今後の拡張

- [ ] 受賞作品ページ（`awards.html`）の追加
  - `gallery.html` ヘッダーの「Coming Soon」リンクを実リンクに差し替え
- [ ] 受賞バッジ表示（`entries.json` に `award` フィールドを追加して条件付き描画）
- [ ] カテゴリ・タグによる絞り込み
- [ ] OGP画像の動的生成

---

## 📄 ライセンス・運営

- 主催: 白井市 / Metagri研究所（株式会社農情人）
- 参加規約: <https://metagri-labo.com/metagri-shiroi-pr-video-contest-term/>
- お問い合わせ: <https://metagri-labo.com/contact/>

---

## 🙋 トラブルシューティング

### `vercel dev` でAPI呼び出しが500エラーになる

→ KV環境変数が未取得の可能性。`vercel env pull .env.local` を実行してから再起動してください。

### いいねを押しても数が増えない

→ ブラウザのコンソールを確認。`like API error` が出ていれば KV未接続。Vercelダッシュボードで Storage が当該プロジェクトに接続されているか確認してください。
→ 接続済みの場合でも、UIは localStorage で「押した状態」になります（フォールバック動作）。

### 作品を追加したのに表示されない

→ `data/entries.json` が valid JSONか確認（末尾カンマ等に注意）。
→ CDNキャッシュ（最大60秒）の可能性。スーパーリロードを試してください。
→ `submittedAt` の日付形式が `YYYY-MM-DD` か確認。

### YouTube動画が再生されない

→ `youtubeId` が動画IDのみになっているか確認（URL全体ではなく `v=` 以降のみ）。
→ 動画の埋め込みが許可されているか、YouTubeの動画設定を確認してください。
