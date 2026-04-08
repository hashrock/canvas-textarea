import { Editor } from "./editor";

const canvas = document.querySelector<HTMLCanvasElement>("#canv")!;
const ed = new Editor(canvas);

ed.text = `自作エディタコンポーネント
Canvas上にテキストを描画し、pretextで折り返しとレイアウトを計算しています。

ABCDEFABCDEFABCDEFABCDEFABCDEF
表示テスト表示テスト表示テスト表示テスト表示テスト

# 見出し

- リスト1
- リスト2
- リスト3
- リスト4
- リスト5

This is a long line that should wrap around when it exceeds the canvas width boundary. Pretext handles word breaking and line wrapping automatically.

スクロールのテスト用に行を増やしています。
バーチャルスクロールバーをドラッグしたり、マウスホイールでスクロールできます。
カーソルキーで移動すると、自動的にスクロールが追従します。

Lorem ipsum dolor sit amet, consectetur adipiscing elit.
Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

最終行です。`;
