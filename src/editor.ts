import { Cursor, type Point } from "./cursor";
import { redraw, setupTextDrawStyle, LINE_HEIGHT } from "./draw";

export class Editor {
  private ctx: CanvasRenderingContext2D;
  private cursor: Cursor;
  private input: HTMLTextAreaElement;
  private offset = 0;
  private lines: string[] = [];
  private canvas: HTMLCanvasElement;
  private mousedown = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    setupTextDrawStyle(this.ctx);
    this.cursor = new Cursor();

    const textarea = document.createElement("textarea");
    textarea.setAttribute("id", "cursor");
    textarea.setAttribute("autofocus", "autofocus");
    canvas.parentElement!.appendChild(textarea);
    this.input = textarea;

    this.addKeyboardEvents();
    this.addPointerEvents();
    this.addTextareaEvents();
    this.draw();
  }

  set text(v: string) {
    this.lines = v.split("\n");
    this.draw();
  }

  private draw() {
    redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
  }

  private addKeyboardEvents() {
    document.body.addEventListener("keydown", (e) => {
      this.input.focus();
      this.offset += 1;

      switch (e.key) {
        case "Backspace":
          this.backSpace();
          break;
        case "ArrowLeft":
          this.moveLeft();
          break;
        case "ArrowUp":
          this.moveUp();
          break;
        case "ArrowRight":
          this.moveRight();
          break;
        case "ArrowDown":
          this.moveDown();
          break;
      }

      if (!e.shiftKey) {
        this.cursor.cancelSelection();
      }
      this.draw();
    });
  }

  private addPointerEvents() {
    this.canvas.addEventListener("pointerdown", (e) => {
      const p = this.getClickedPosition(e.offsetX, e.offsetY);
      this.cursor.p = p;
      this.cursor.cancelSelection();
      this.mousedown = true;
      this.draw();
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.mousedown) {
        const p = this.getClickedPosition(e.offsetX, e.offsetY);
        this.cursor.p = p;
        this.draw();
      }
    });

    this.canvas.addEventListener("pointerup", () => {
      this.mousedown = false;
      this.input.focus();
    });
  }

  private addTextareaEvents() {
    this.input.addEventListener("compositionstart", (e) => {
      (e.target as HTMLTextAreaElement).style.opacity = "1";
    });

    this.input.addEventListener("compositionend", (e) => {
      const el = e.target as HTMLTextAreaElement;
      el.style.opacity = "0";
      this.insert(el.value);
      el.value = "";
      this.draw();
    });

    this.input.addEventListener("input", (e) => {
      const el = e.target as HTMLTextAreaElement;
      if (!(e as InputEvent).isComposing) {
        el.style.opacity = "0";
        if (el.value === "\n") {
          this.insertBr();
        } else {
          this.insert(el.value);
        }
        el.value = "";
        this.draw();
      }
    });
  }

  private getClickedPosition(x: number, y: number): Point {
    let r = Math.floor(y / LINE_HEIGHT);
    r = Math.max(0, Math.min(r, this.lines.length - 1));
    const line = this.lines[r];
    let c = line.length;
    for (let i = 0; i < line.length; i++) {
      const len = this.ctx.measureText(line.slice(0, i));
      if (x < len.width) {
        c = Math.max(0, i - 1);
        break;
      }
    }
    return { r, c };
  }

  private get thisLine() {
    return this.lines[this.cursor.r];
  }

  private backSpace() {
    if (this.cursor.c === 0) {
      if (this.cursor.r > 0) {
        this.joinLine();
      }
    } else {
      this.lines[this.cursor.r] =
        this.thisLine.slice(0, this.cursor.c - 1) +
        this.thisLine.slice(this.cursor.c);
      this.cursor.c -= 1;
    }
  }

  private moveDown() {
    this.cursor.r += 1;
    if (this.cursor.r >= this.lines.length) {
      this.cursor.r = this.lines.length - 1;
      this.cursor.c = this.lines[this.cursor.r].length;
    }
  }

  private moveUp() {
    this.cursor.r -= 1;
    if (this.cursor.r < 0) {
      this.cursor.r = 0;
      this.cursor.c = 0;
    }
  }

  private moveRight() {
    this.cursor.c += 1;
    if (this.cursor.c > this.lines[this.cursor.r].length) {
      if (this.cursor.r < this.lines.length - 1) {
        this.cursor.r += 1;
        this.cursor.c = 0;
      } else {
        this.cursor.c = this.lines[this.cursor.r].length;
      }
    }
  }

  private moveLeft() {
    this.cursor.c -= 1;
    if (this.cursor.c < 0) {
      if (this.cursor.r > 0) {
        this.cursor.r -= 1;
        this.cursor.c = this.thisLine.length;
      } else {
        this.cursor.c = 0;
      }
    }
  }

  private insert(text: string) {
    const t = this.lines[this.cursor.r];
    this.lines[this.cursor.r] = t.slice(0, this.cursor.c) + text + t.slice(this.cursor.c);
    this.cursor.c += text.length;
    this.cursor.cancelSelection();
  }

  private insertBr() {
    const t = this.lines[this.cursor.r];
    this.lines[this.cursor.r] = t.slice(0, this.cursor.c);
    this.lines.splice(this.cursor.r + 1, 0, t.slice(this.cursor.c));
    this.cursor.r += 1;
    this.cursor.c = 0;
    this.cursor.cancelSelection();
  }

  private joinLine() {
    this.cursor.c = this.lines[this.cursor.r - 1].length;
    this.lines[this.cursor.r - 1] += this.lines[this.cursor.r];
    this.lines.splice(this.cursor.r, 1);
    this.cursor.r -= 1;
  }
}
