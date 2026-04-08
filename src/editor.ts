import { Cursor } from "./cursor";
import { redraw, setupCtx, SCROLLBAR_WIDTH, getScrollbarThumbRect } from "./draw";
import {
  computeLayout,
  toAbsoluteOffset,
  toVisualPosition,
  type TextLayout,
  LINE_HEIGHT,
} from "./layout";

export class Editor {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private input: HTMLTextAreaElement;
  private cursor = new Cursor();
  private _text = "";
  private layout: TextLayout = { visualLines: [] };
  private mousedown = false;
  private scrollY = 0;
  private scrollbarDragging = false;
  private scrollbarDragStartY = 0;
  private scrollbarDragStartScrollY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    setupCtx(this.ctx);

    const textarea = document.createElement("textarea");
    textarea.setAttribute("id", "cursor");
    textarea.setAttribute("autofocus", "autofocus");
    canvas.parentElement!.appendChild(textarea);
    this.input = textarea;

    this.addKeyboardEvents();
    this.addPointerEvents();
    this.addTextareaEvents();
    this.addWheelEvent();
    this.reflow();
    this.draw();
  }

  set text(v: string) {
    this._text = v;
    this.cursor.offset = 0;
    this.cursor.anchor = 0;
    this.scrollY = 0;
    this.reflow();
    this.draw();
  }

  private get contentHeight() {
    return this.layout.visualLines.length * LINE_HEIGHT;
  }

  private get maxScrollY() {
    return Math.max(0, this.contentHeight - this.canvas.height);
  }

  private get textAreaWidth() {
    return this.canvas.width - SCROLLBAR_WIDTH;
  }

  private reflow() {
    this.layout = computeLayout(this._text, this.textAreaWidth);
  }

  private draw() {
    redraw(this.ctx, this.layout, this.cursor, this.input, this.scrollY);
  }

  private clampScroll() {
    this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxScrollY));
  }

  private scrollToCursor() {
    const pos = toVisualPosition(this.layout, this.cursor.offset);
    const cursorTop = pos.row * LINE_HEIGHT;
    const cursorBottom = cursorTop + LINE_HEIGHT;

    if (cursorTop < this.scrollY) {
      this.scrollY = cursorTop;
    } else if (cursorBottom > this.scrollY + this.canvas.height) {
      this.scrollY = cursorBottom - this.canvas.height;
    }
    this.clampScroll();
  }

  private addWheelEvent() {
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.scrollY += e.deltaY;
      this.clampScroll();
      this.draw();
    }, { passive: false });
  }

  private isOnScrollbar(x: number): boolean {
    return x >= this.canvas.width - SCROLLBAR_WIDTH;
  }

  private addKeyboardEvents() {
    document.body.addEventListener("keydown", (e) => {
      this.input.focus();

      switch (e.key) {
        case "Backspace":
          this.backSpace();
          break;
        case "Delete":
          this.delete();
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
        case "Home":
          this.moveLineStart();
          break;
        case "End":
          this.moveLineEnd();
          break;
        default:
          return;
      }

      if (!e.shiftKey) {
        this.cursor.cancelSelection();
      }
      e.preventDefault();
      this.scrollToCursor();
      this.draw();
    });
  }

  private addPointerEvents() {
    this.canvas.addEventListener("pointerdown", (e) => {
      // Scrollbar drag
      if (this.isOnScrollbar(e.offsetX)) {
        const thumb = getScrollbarThumbRect(
          this.canvas.height,
          this.contentHeight,
          this.scrollY,
          this.canvas.width
        );
        if (thumb && e.offsetY >= thumb.y && e.offsetY <= thumb.y + thumb.h) {
          // Drag thumb
          this.scrollbarDragging = true;
          this.scrollbarDragStartY = e.offsetY;
          this.scrollbarDragStartScrollY = this.scrollY;
          this.canvas.setPointerCapture(e.pointerId);
        } else if (this.maxScrollY > 0) {
          // Click on track — jump to position
          const ratio = e.offsetY / this.canvas.height;
          this.scrollY = ratio * this.maxScrollY;
          this.clampScroll();
          this.draw();
        }
        return;
      }

      const offset = this.hitTest(e.offsetX, e.offsetY);
      this.cursor.offset = offset;
      this.cursor.cancelSelection();
      this.mousedown = true;
      this.draw();
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (this.scrollbarDragging) {
        const deltaY = e.offsetY - this.scrollbarDragStartY;
        const trackRange = this.canvas.height - Math.max(24, (this.canvas.height / this.contentHeight) * this.canvas.height);
        if (trackRange > 0) {
          this.scrollY = this.scrollbarDragStartScrollY + (deltaY / trackRange) * this.maxScrollY;
          this.clampScroll();
          this.draw();
        }
        return;
      }
      if (this.mousedown) {
        this.cursor.offset = this.hitTest(e.offsetX, e.offsetY);
        this.scrollToCursor();
        this.draw();
      }
    });

    this.canvas.addEventListener("pointerup", (e) => {
      if (this.scrollbarDragging) {
        this.scrollbarDragging = false;
        this.canvas.releasePointerCapture(e.pointerId);
        return;
      }
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
      this.insertText(el.value);
      el.value = "";
    });

    this.input.addEventListener("input", (e) => {
      const el = e.target as HTMLTextAreaElement;
      if (!(e as InputEvent).isComposing) {
        el.style.opacity = "0";
        this.insertText(el.value);
        el.value = "";
      }
    });
  }

  private hitTest(x: number, y: number): number {
    const lines = this.layout.visualLines;
    let row = Math.floor((y + this.scrollY) / LINE_HEIGHT);
    row = Math.max(0, Math.min(row, lines.length - 1));
    const line = lines[row];

    let col = line.text.length;
    for (let i = 1; i <= line.text.length; i++) {
      const w = this.ctx.measureText(line.text.slice(0, i)).width;
      const prevW =
        i > 1 ? this.ctx.measureText(line.text.slice(0, i - 1)).width : 0;
      const mid = (prevW + w) / 2;
      if (x < mid) {
        col = i - 1;
        break;
      }
    }

    return toAbsoluteOffset(this.layout, row, col);
  }

  private insertText(str: string) {
    const before = this._text.slice(0, this.cursor.selStart);
    const after = this._text.slice(this.cursor.selEnd);
    this._text = before + str + after;
    this.cursor.offset = before.length + str.length;
    this.cursor.cancelSelection();
    this.reflow();
    this.scrollToCursor();
    this.draw();
  }

  private backSpace() {
    if (this.cursor.hasSelection) {
      this.insertText("");
      return;
    }
    if (this.cursor.offset === 0) return;
    const before = this._text.slice(0, this.cursor.offset - 1);
    const after = this._text.slice(this.cursor.offset);
    this._text = before + after;
    this.cursor.offset -= 1;
    this.cursor.cancelSelection();
    this.reflow();
    this.scrollToCursor();
    this.draw();
  }

  private delete() {
    if (this.cursor.hasSelection) {
      this.insertText("");
      return;
    }
    if (this.cursor.offset >= this._text.length) return;
    const before = this._text.slice(0, this.cursor.offset);
    const after = this._text.slice(this.cursor.offset + 1);
    this._text = before + after;
    this.reflow();
    this.draw();
  }

  private moveLeft() {
    if (this.cursor.offset > 0) {
      this.cursor.offset -= 1;
    }
  }

  private moveRight() {
    if (this.cursor.offset < this._text.length) {
      this.cursor.offset += 1;
    }
  }

  private moveUp() {
    const pos = toVisualPosition(this.layout, this.cursor.offset);
    if (pos.row === 0) {
      this.cursor.offset = 0;
      return;
    }
    const cursorX = this.ctx.measureText(
      this.layout.visualLines[pos.row].text.slice(0, pos.col)
    ).width;
    const targetRow = pos.row - 1;
    const col = this.xToCol(targetRow, cursorX);
    this.cursor.offset = toAbsoluteOffset(this.layout, targetRow, col);
  }

  private moveDown() {
    const pos = toVisualPosition(this.layout, this.cursor.offset);
    if (pos.row >= this.layout.visualLines.length - 1) {
      this.cursor.offset = this._text.length;
      return;
    }
    const cursorX = this.ctx.measureText(
      this.layout.visualLines[pos.row].text.slice(0, pos.col)
    ).width;
    const targetRow = pos.row + 1;
    const col = this.xToCol(targetRow, cursorX);
    this.cursor.offset = toAbsoluteOffset(this.layout, targetRow, col);
  }

  private moveLineStart() {
    const pos = toVisualPosition(this.layout, this.cursor.offset);
    this.cursor.offset = toAbsoluteOffset(this.layout, pos.row, 0);
  }

  private moveLineEnd() {
    const pos = toVisualPosition(this.layout, this.cursor.offset);
    const line = this.layout.visualLines[pos.row];
    this.cursor.offset = toAbsoluteOffset(this.layout, pos.row, line.text.length);
  }

  private xToCol(row: number, targetX: number): number {
    const lineText = this.layout.visualLines[row].text;
    let bestCol = 0;
    let bestDist = targetX;

    for (let i = 1; i <= lineText.length; i++) {
      const w = this.ctx.measureText(lineText.slice(0, i)).width;
      const dist = Math.abs(w - targetX);
      if (dist < bestDist) {
        bestDist = dist;
        bestCol = i;
      }
    }
    return bestCol;
  }
}
