import { Cursor, Point } from "./cursor";
import { redraw, setupTextDrawStyle, fontsize, lineHeight } from "./draw";

export class Editor {
  ctx: CanvasRenderingContext2D;
  cursor: Cursor;
  input: HTMLTextAreaElement;
  offset = 0;
  lines: string[] = [];
  canvas: HTMLCanvasElement;
  mousedown: boolean;

  addEventTextarea() {
    this.input.addEventListener("compositionstart", e => {
      const el: HTMLTextAreaElement = e.target as HTMLTextAreaElement;
      el.style.opacity = "1";
    });
    this.input.addEventListener("compositionend", e => {
      const el: HTMLTextAreaElement = e.target as HTMLTextAreaElement;
      el.style.opacity = "0";
      this.insert(el.value, this.cursor);
      el.value = "";
      redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
    });
    this.input.addEventListener("input", (e: InputEvent) => {
      const el: HTMLTextAreaElement = e.target as HTMLTextAreaElement;
      if (!e.isComposing) {
        el.style.opacity = "0";
        if (el.value === "\n") {
          this.insertBr(this.cursor);
        } else {
          this.insert(el.value, this.cursor);
        }

        el.value = "";
        redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
      }
    });
  }

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const textarea = document.createElement("textarea");
    textarea.setAttribute("id", "cursor");
    textarea.setAttribute("autofocus", "autofocus");
    canvas.parentElement.appendChild(textarea);
    this.input = textarea;

    this.ctx = (canvas as HTMLCanvasElement).getContext("2d");
    setupTextDrawStyle(this.ctx);
    this.cursor = new Cursor();
    document.body.addEventListener("keydown", e => {
      this.onKeyDown(e);
    });
    redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);

    this.canvas.addEventListener("pointerdown", e => {
      const p = this.getClickedPosition(e.offsetX, e.offsetY);
      this.cursor.p = p;
      this.cursor.cancelSelection();
      this.mousedown = true;

      redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
    });

    this.canvas.addEventListener("pointermove", e => {
      if (this.mousedown) {
        const p = this.getClickedPosition(e.offsetX, e.offsetY);
        this.cursor.p = p;
        redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
      }
    });
    this.canvas.addEventListener("pointerup", e => {
      this.mousedown = false;
      this.input.focus();
    });

    this.addEventTextarea();
  }

  set text(v: string) {
    this.lines = v.split("\n");
    redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
  }

  getClickedPosition(x: number, y: number): Point {
    let r = Math.floor(y / lineHeight);

    //set max column at first
    let c = this.lines[r].length;
    for (let i = 0; i < this.lines[r].length; i++) {
      const len = this.ctx.measureText(this.lines[r].slice(0, i));
      if (x < len.width) {
        c = i - 1;
        break;
      }
    }
    return {
      r: r,
      c: c
    };
  }

  get thisLine() {
    return this.lines[this.cursor.r];
  }

  moveFileStart() {
    this.cursor.r = 0;
    this.cursor.c = 0;
  }

  moveFileEnd() {
    this.cursor.r = this.lines.length - 1;
    this.cursor.c = this.lines[this.lines.length - 1].length;
  }

  moveNextLineStart() {
    this.cursor.r += 1;
    this.cursor.c = 0;
  }

  movePrevLineEnd() {
    this.cursor.r -= 1;
    this.cursor.c = this.thisLine.length;
  }

  onKeyDown(e: KeyboardEvent) {
    this.input.focus();
    this.offset += 1;
    switch (e.keyCode) {
      case 8: // Backspace
        this.backSpace();

        break;
      case 46: // Delete
        break;
      case 13: // Enter
        break;
      case 37: // Left arrow
        this.moveLeft();

        break;
      case 38: // Up arrow
        this.moveUp();
        break;
      case 39: // Right arrow
        this.moveRight();
        break;
      case 40: // Down arrow
        this.moveDown();
        break;
      default:
    }

    if (!e.shiftKey) {
      this.cursor.cancelSelection();
    }
    redraw(this.ctx, this.lines, this.cursor, this.offset, this.input);
  }

  backSpace() {
    if (this.cursor.p.c === 0) {
      this.joinLine(this.cursor);
    } else {
      this.removeCharBefore();
      this.cursor.p.c -= 1;
    }
  }

  removeCharBefore() {
    this.lines[this.cursor.p.r] =
      this.lines[this.cursor.p.r].slice(0, this.cursor.c - 1) +
      this.lines[this.cursor.r].slice(this.cursor.c);
  }

  moveDown() {
    this.cursor.r += 1;
    if (this.cursor.r === this.lines.length) {
      this.moveFileEnd();
    }
  }

  moveRight() {
    this.cursor.c += 1;
    if (this.cursor.c > this.lines[this.cursor.r].length) {
      this.moveNextLineStart();
    }
  }

  moveUp() {
    this.cursor.r -= 1;
    if (this.cursor.r < 0) {
      this.moveFileStart();
    }
  }

  moveLeft() {
    this.cursor.c -= 1;
    if (this.cursor.c < 0) {
      this.movePrevLineEnd();
    }
  }

  insert(text: string, cursor: Cursor) {
    const t = this.lines[cursor.r];
    this.lines[cursor.r] = t.slice(0, cursor.c) + text + t.slice(cursor.c);
    cursor.c += text.length;
    cursor.cancelSelection();
  }
  insertBr(cursor: Cursor) {
    const t = this.lines[cursor.r];
    this.lines[cursor.r] = t.slice(0, cursor.c);
    this.lines.splice(cursor.r + 1, 0, t.slice(cursor.c));
    cursor.r += 1;
    cursor.c = 0;
    cursor.cancelSelection();
  }
  joinLine(cursor: Cursor) {
    cursor.c = this.lines[cursor.r - 1].length;
    this.lines[cursor.r - 1] = this.lines[cursor.r - 1] + this.lines[cursor.r];
    this.lines.splice(cursor.r, 1);
    cursor.r -= 1;
  }
}
