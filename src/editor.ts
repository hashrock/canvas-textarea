import { Cursor } from "./cursor";
import { redraw, setupCtx, SCROLLBAR_WIDTH, getScrollbarThumbRect } from "./draw";
import {
  computeLayout,
  toAbsoluteOffset,
  toVisualPosition,
  type TextLayout,
  LINE_HEIGHT,
} from "./layout";

interface Snapshot {
  text: string;
  offset: number;
}

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
  private cssWidth = 0;
  private cssHeight = 0;
  private undoStack: Snapshot[] = [];
  private redoStack: Snapshot[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupHiDPI();
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
    this.undoStack = [];
    this.redoStack = [];
    this.reflow();
    this.draw();
  }

  private setupHiDPI() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.cssWidth = rect.width || this.canvas.width;
    this.cssHeight = rect.height || this.canvas.height;
    this.canvas.width = this.cssWidth * dpr;
    this.canvas.height = this.cssHeight * dpr;
    this.canvas.style.width = `${this.cssWidth}px`;
    this.canvas.style.height = `${this.cssHeight}px`;
  }

  private get contentHeight() {
    return this.layout.visualLines.length * LINE_HEIGHT;
  }

  private get maxScrollY() {
    return Math.max(0, this.contentHeight - this.cssHeight);
  }

  private get textAreaWidth() {
    return this.cssWidth - SCROLLBAR_WIDTH;
  }

  private reflow() {
    this.layout = computeLayout(this._text, this.textAreaWidth);
  }

  private draw() {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(dpr, dpr);
    redraw(ctx, this.layout, this.cursor, this.input, this.scrollY, this.cssWidth, this.cssHeight);
    ctx.restore();
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
    } else if (cursorBottom > this.scrollY + this.cssHeight) {
      this.scrollY = cursorBottom - this.cssHeight;
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
    return x >= this.cssWidth - SCROLLBAR_WIDTH;
  }

  // --- Undo / Redo ---

  private pushUndo() {
    this.undoStack.push({ text: this._text, offset: this.cursor.offset });
    this.redoStack = [];
  }

  private undo() {
    const snap = this.undoStack.pop();
    if (!snap) return;
    this.redoStack.push({ text: this._text, offset: this.cursor.offset });
    this._text = snap.text;
    this.cursor.offset = snap.offset;
    this.cursor.cancelSelection();
    this.reflow();
    this.scrollToCursor();
    this.draw();
  }

  private redo() {
    const snap = this.redoStack.pop();
    if (!snap) return;
    this.undoStack.push({ text: this._text, offset: this.cursor.offset });
    this._text = snap.text;
    this.cursor.offset = snap.offset;
    this.cursor.cancelSelection();
    this.reflow();
    this.scrollToCursor();
    this.draw();
  }

  // --- Keyboard ---

  private addKeyboardEvents() {
    document.body.addEventListener("keydown", (e) => {
      if (e.isComposing) return;
      this.input.focus();

      const cmd = e.metaKey || e.ctrlKey;
      const alt = e.altKey;

      // Cmd/Ctrl shortcuts
      if (cmd) {
        switch (e.key) {
          case "a":
            this.selectAll();
            e.preventDefault();
            this.draw();
            return;
          case "z":
            if (e.shiftKey) {
              this.redo();
            } else {
              this.undo();
            }
            e.preventDefault();
            return;
          case "ArrowLeft":
            this.moveLineStart();
            break;
          case "ArrowRight":
            this.moveLineEnd();
            break;
          case "ArrowUp":
            this.cursor.offset = 0;
            break;
          case "ArrowDown":
            this.cursor.offset = this._text.length;
            break;
          case "Backspace":
            this.deleteToLineStart();
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
        return;
      }

      // Alt shortcuts (word-level)
      if (alt) {
        switch (e.key) {
          case "ArrowLeft":
            this.moveWordLeft();
            break;
          case "ArrowRight":
            this.moveWordRight();
            break;
          case "Backspace":
            this.deleteWordLeft();
            break;
          case "Delete":
            this.deleteWordRight();
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
        return;
      }

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

  // --- Pointer ---

  private capture(e: PointerEvent) {
    try { this.canvas.setPointerCapture(e.pointerId); } catch { /* synthetic or expired pointer */ }
  }

  private releaseCapture(e: PointerEvent) {
    try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
  }

  private toLocalCoords(e: PointerEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private addPointerEvents() {
    this.canvas.addEventListener("dblclick", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const offset = this.hitTest(x, y);
      const { start, end } = this.wordBoundaryAt(offset);
      this.cursor.anchor = start;
      this.cursor.offset = end;
      this.draw();
    });

    this.canvas.addEventListener("pointerdown", (e) => {
      const { x, y } = this.toLocalCoords(e);
      // Scrollbar drag
      if (this.isOnScrollbar(x)) {
        const thumb = getScrollbarThumbRect(
          this.cssHeight,
          this.contentHeight,
          this.scrollY,
          this.cssWidth
        );
        if (thumb && y >= thumb.y && y <= thumb.y + thumb.h) {
          this.scrollbarDragging = true;
          this.scrollbarDragStartY = y;
          this.scrollbarDragStartScrollY = this.scrollY;
          this.capture(e);
        } else if (this.maxScrollY > 0) {
          const ratio = y / this.cssHeight;
          this.scrollY = ratio * this.maxScrollY;
          this.clampScroll();
          this.draw();
        }
        return;
      }

      const offset = this.hitTest(x, y);
      this.cursor.offset = offset;
      this.cursor.cancelSelection();
      this.mousedown = true;
      this.capture(e);
      this.draw();
    });

    this.canvas.addEventListener("pointermove", (e) => {
      const { x, y } = this.toLocalCoords(e);

      if (this.scrollbarDragging) {
        const deltaY = y - this.scrollbarDragStartY;
        const trackRange = this.cssHeight - Math.max(24, (this.cssHeight / this.contentHeight) * this.cssHeight);
        if (trackRange > 0) {
          this.scrollY = this.scrollbarDragStartScrollY + (deltaY / trackRange) * this.maxScrollY;
          this.clampScroll();
          this.draw();
        }
        return;
      }
      if (this.mousedown) {
        this.cursor.offset = this.hitTest(x, y);
        this.scrollToCursor();
        this.draw();
      }
    });

    this.canvas.addEventListener("pointerup", (e) => {
      if (this.scrollbarDragging) {
        this.scrollbarDragging = false;
        this.releaseCapture(e);
        return;
      }
      if (this.mousedown) {
        this.mousedown = false;
        this.releaseCapture(e);
      }
      this.input.focus();
    });
  }

  // --- IME / Input ---

  private addTextareaEvents() {
    this.input.addEventListener("compositionstart", (e) => {
      (e.target as HTMLTextAreaElement).style.opacity = "1";
    });

    this.input.addEventListener("compositionend", (e) => {
      const el = e.target as HTMLTextAreaElement;
      el.style.opacity = "0";
      el.style.width = "0";
      this.insertText(el.value);
      el.value = "";
    });

    this.input.addEventListener("input", (e) => {
      const el = e.target as HTMLTextAreaElement;
      if ((e as InputEvent).isComposing) {
        const w = this.ctx.measureText(el.value).width;
        el.style.width = `${Math.max(w, 10)}px`;
      } else {
        el.style.opacity = "0";
        el.style.width = "0";
        this.insertText(el.value);
        el.value = "";
      }
    });
  }

  // --- Word boundary ---

  private getWordSegments(): Array<{ index: number; length: number }> {
    const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });
    const result: Array<{ index: number; length: number }> = [];
    for (const seg of segmenter.segment(this._text)) {
      result.push({ index: seg.index, length: seg.segment.length });
    }
    return result;
  }

  private wordBoundaryAt(offset: number): { start: number; end: number } {
    for (const seg of this.getWordSegments()) {
      const segEnd = seg.index + seg.length;
      if (offset >= seg.index && offset < segEnd) {
        return { start: seg.index, end: segEnd };
      }
    }
    return { start: offset, end: offset };
  }

  private moveWordLeft() {
    if (this.cursor.offset === 0) return;
    const segments = this.getWordSegments();
    for (let i = segments.length - 1; i >= 0; i--) {
      if (segments[i].index < this.cursor.offset) {
        this.cursor.offset = segments[i].index;
        return;
      }
    }
    this.cursor.offset = 0;
  }

  private moveWordRight() {
    if (this.cursor.offset >= this._text.length) return;
    for (const seg of this.getWordSegments()) {
      const segEnd = seg.index + seg.length;
      if (segEnd > this.cursor.offset) {
        this.cursor.offset = segEnd;
        return;
      }
    }
    this.cursor.offset = this._text.length;
  }

  private deleteWordLeft() {
    if (this.cursor.hasSelection) {
      this.insertText("");
      return;
    }
    if (this.cursor.offset === 0) return;
    const target = this.cursor.offset;
    this.moveWordLeft();
    this.pushUndo();
    this._text = this._text.slice(0, this.cursor.offset) + this._text.slice(target);
    this.cursor.cancelSelection();
    this.reflow();
    this.scrollToCursor();
    this.draw();
  }

  private deleteWordRight() {
    if (this.cursor.hasSelection) {
      this.insertText("");
      return;
    }
    if (this.cursor.offset >= this._text.length) return;
    const from = this.cursor.offset;
    // Find word end
    let end = this._text.length;
    for (const seg of this.getWordSegments()) {
      const segEnd = seg.index + seg.length;
      if (segEnd > from) {
        end = segEnd;
        break;
      }
    }
    this.pushUndo();
    this._text = this._text.slice(0, from) + this._text.slice(end);
    this.reflow();
    this.draw();
  }

  private deleteToLineStart() {
    if (this.cursor.hasSelection) {
      this.insertText("");
      return;
    }
    const pos = toVisualPosition(this.layout, this.cursor.offset);
    const lineStart = toAbsoluteOffset(this.layout, pos.row, 0);
    if (lineStart === this.cursor.offset) return;
    this.pushUndo();
    this._text = this._text.slice(0, lineStart) + this._text.slice(this.cursor.offset);
    this.cursor.offset = lineStart;
    this.cursor.cancelSelection();
    this.reflow();
    this.scrollToCursor();
    this.draw();
  }

  // --- Hit testing ---

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

  // --- Text mutations ---

  private selectAll() {
    this.cursor.anchor = 0;
    this.cursor.offset = this._text.length;
  }

  private insertText(str: string) {
    this.pushUndo();
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
    this.pushUndo();
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
    this.pushUndo();
    const before = this._text.slice(0, this.cursor.offset);
    const after = this._text.slice(this.cursor.offset + 1);
    this._text = before + after;
    this.reflow();
    this.draw();
  }

  // --- Cursor movement ---

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
