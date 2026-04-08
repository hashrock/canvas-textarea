const canvas: HTMLCanvasElement = document.querySelector("#canv");
import { Editor } from "./editor";
import { example } from "./example";

const ed = new Editor(canvas);
ed.text = example;
