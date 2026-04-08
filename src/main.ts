import { Editor } from "./editor";

const canvas = document.querySelector<HTMLCanvasElement>("#canv")!;
const ed = new Editor(canvas);

ed.text = `自作エディタコンポーネント
てすてす

ABCDEFABCDEFABCDEFABCDEFABCDEF
表示テスト表示テスト表示テスト表示テスト表示テスト

# 見出し

- リスト
- リスト
- リスト
- リスト
- リスト

whoooooaaaaaaaaa
`;
