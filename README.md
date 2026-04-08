# canvas-textarea

Canvas 上に描画するテキストエディタコンポーネントの実験的実装。DOM ベースの textarea/contenteditable を使わず、Canvas 2D API で文字の描画・選択・カーソル表示をすべて自前で行う。

テキストの折り返しと位置計測には [@chenglou/pretext](https://github.com/chenglou/pretext) を使用。

## 用途

- Canvas / WebGL ベースのアプリケーション内でのテキスト入力（Figma のようなデザインツール等）
- DOM リフローに依存しないテキスト描画の実験

## 機能

- テキストの折り返し表示（pretext による `pre-wrap` レイアウト）
- クリック・ドラッグによるカーソル移動と範囲選択
- ダブルクリックで単語選択（`Intl.Segmenter` による単語境界検出）
- キーボード操作（矢印キー、Home/End）
- Cmd/Ctrl+A: 全選択
- Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z: Undo / Redo
- Alt+矢印: 単語単位の移動
- Cmd+矢印: 行頭/行末・ファイル先頭/末尾への移動
- Alt+Backspace/Delete: 単語単位の削除
- Cmd+Backspace: 行頭まで削除
- Shift 併用で選択範囲の拡張
- IME（日本語入力）対応、変換中テキスト幅の自動調整
- バーチャルスクロールバー（ドラッグ・トラッククリック・ホイール対応）
- HiDPI (Retina) 対応
- 可視範囲のみの描画による最適化

## セットアップ

```bash
npm install
npm run dev      # 開発サーバー起動
npm run build    # プロダクションビルド
```

## アーキテクチャ

```
src/
  main.ts      エントリポイント。Canvas 要素を取得し Editor を生成
  editor.ts    エディタ本体。テキスト状態管理、イベント処理、Undo/Redo
  layout.ts    pretext を使った折り返しレイアウト計算、オフセット変換
  draw.ts      Canvas 2D 描画（テキスト、カーソル、選択、スクロールバー）
  cursor.ts    カーソル状態（絶対オフセット + アンカーによる選択範囲）
```

### データモデル

テキストは**単一の文字列**として保持し、カーソル位置は文字列内の**絶対オフセット**で管理する。論理行（`\n` 区切り）ではなく絶対オフセットを使うことで、折り返しによる視覚行とのマッピングがシンプルになる。

```
"Hello\nWorld"
       ^
       offset = 7 → 'o' in "World"
```

### レイアウト計算 (layout.ts)

1. `prepareWithSegments()` でテキスト全体を解析（1回のみ）
2. `layoutWithLines()` で Canvas 幅に応じた折り返し行を計算
3. 各視覚行に対して元テキスト上の `startOffset` を記録

視覚行とオフセットの変換関数:
- `toVisualPosition(offset)` → `{ row, col }` （描画座標の算出に使用）
- `toAbsoluteOffset(row, col)` → `offset` （クリック位置からの逆変換に使用）

### 描画 (draw.ts)

`redraw()` が毎フレーム呼ばれ、以下を描画する:

1. 可視範囲の行のみをループ（`firstVisible` 〜 `lastVisible`）
2. 選択ハイライト（オフセット範囲と行の重なりを判定）
3. テキスト（`fillText`）
4. カーソル（縦線）
5. スクロールバー（トラック + 角丸サム）

HiDPI 対応は Editor 側で `ctx.scale(dpr, dpr)` を適用し、draw.ts は CSS ピクセル座標で動作する。

### IME 対応

非表示の `<textarea>` を Canvas 上に重ねて配置し、IME の入力インターフェースとして利用する:

- `compositionstart`: textarea を可視化
- `input` (isComposing): 変換中テキスト幅に合わせて textarea の width を動的調整
- `compositionend`: 確定テキストをエディタに挿入、textarea を非表示に戻す
- `keydown` で `e.isComposing` の場合はエディタのキー処理をスキップ

### ポインターイベント

`setPointerCapture` を使用し、Canvas 外へのドラッグでも選択が継続する。座標は `clientX/clientY` + `getBoundingClientRect()` で計算し、キャプチャ中も正確な位置を取得する。

## 技術スタック

- [Vite](https://vite.dev/) - ビルドツール
- [TypeScript](https://www.typescriptlang.org/)
- [@chenglou/pretext](https://github.com/chenglou/pretext) - テキスト計測・折り返しレイアウト

## License

MIT
