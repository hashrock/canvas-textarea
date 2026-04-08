import { Cursor } from "./cursor";
import {
  type TextLayout,
  toVisualPosition,
  FONT,
  FONT_SIZE,
  LINE_HEIGHT,
} from "./layout";

export const SCROLLBAR_WIDTH = 12;

export function setupCtx(ctx: CanvasRenderingContext2D) {
  ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
}

export function redraw(
  ctx: CanvasRenderingContext2D,
  layout: TextLayout,
  cursor: Cursor,
  input: HTMLTextAreaElement,
  scrollY: number,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height);

  const textAreaWidth = width - SCROLLBAR_WIDTH;
  const cursorPos = toVisualPosition(layout, cursor.offset);
  const selStart = cursor.selStart;
  const selEnd = cursor.selEnd;

  // Clip text area (exclude scrollbar region)
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, textAreaWidth, height);
  ctx.clip();

  const totalLines = layout.visualLines.length;
  const firstVisible = Math.max(0, Math.floor(scrollY / LINE_HEIGHT));
  const lastVisible = Math.min(
    totalLines - 1,
    Math.ceil((scrollY + height) / LINE_HEIGHT)
  );

  for (let i = firstVisible; i <= lastVisible; i++) {
    const vl = layout.visualLines[i];
    const y = i * LINE_HEIGHT - scrollY;

    // Draw selection highlight
    if (cursor.hasSelection) {
      drawSelectionForLine(ctx, vl.startOffset, vl.text, selStart, selEnd, y);
    }

    // Draw text
    ctx.fillStyle = "black";
    ctx.font = FONT;
    ctx.fillText(vl.text, 0, y + (LINE_HEIGHT - FONT_SIZE) / 2);
  }

  // Draw cursor
  const cursorLine = layout.visualLines[cursorPos.row];
  const textBeforeCursor = cursorLine.text.slice(0, cursorPos.col);
  ctx.font = FONT;
  const cursorX = ctx.measureText(textBeforeCursor).width;
  const cursorY = cursorPos.row * LINE_HEIGHT - scrollY;

  ctx.beginPath();
  ctx.strokeStyle = "black";
  ctx.moveTo(cursorX + 0.5, cursorY);
  ctx.lineTo(cursorX + 0.5, cursorY + LINE_HEIGHT);
  ctx.stroke();

  ctx.restore();

  // Position hidden textarea for IME
  input.style.left = `${cursorX}px`;
  input.style.top = `${cursorY}px`;

  // Draw scrollbar
  drawScrollbar(ctx, layout, scrollY, width, height);
}

function drawScrollbar(
  ctx: CanvasRenderingContext2D,
  layout: TextLayout,
  scrollY: number,
  width: number,
  height: number
) {
  const contentHeight = layout.visualLines.length * LINE_HEIGHT;
  if (contentHeight <= height) return;

  const trackX = width - SCROLLBAR_WIDTH;

  // Track background
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(trackX, 0, SCROLLBAR_WIDTH, height);

  // Thumb
  const thumbHeight = Math.max(24, (height / contentHeight) * height);
  const maxScrollY = contentHeight - height;
  const thumbY = (scrollY / maxScrollY) * (height - thumbHeight);

  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  roundRect(ctx, trackX + 2, thumbY + 2, SCROLLBAR_WIDTH - 4, thumbHeight - 4, 3);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawSelectionForLine(
  ctx: CanvasRenderingContext2D,
  lineStartOffset: number,
  lineText: string,
  selStart: number,
  selEnd: number,
  y: number
) {
  const lineEnd = lineStartOffset + lineText.length;

  if (selEnd <= lineStartOffset || selStart >= lineEnd) return;

  const localStart = Math.max(0, selStart - lineStartOffset);
  const localEnd = Math.min(lineText.length, selEnd - lineStartOffset);

  const xStart = ctx.measureText(lineText.slice(0, localStart)).width;
  const xEnd = ctx.measureText(lineText.slice(0, localEnd)).width;

  ctx.fillStyle = "hsl(210, 80%, 80%)";
  ctx.fillRect(xStart, y, xEnd - xStart, LINE_HEIGHT);
}

export function getScrollbarThumbRect(
  canvasHeight: number,
  contentHeight: number,
  scrollY: number,
  canvasWidth: number
): { x: number; y: number; w: number; h: number } | null {
  if (contentHeight <= canvasHeight) return null;
  const thumbHeight = Math.max(24, (canvasHeight / contentHeight) * canvasHeight);
  const maxScrollY = contentHeight - canvasHeight;
  const thumbY = (scrollY / maxScrollY) * (canvasHeight - thumbHeight);
  return {
    x: canvasWidth - SCROLLBAR_WIDTH + 2,
    y: thumbY + 2,
    w: SCROLLBAR_WIDTH - 4,
    h: thumbHeight - 4,
  };
}
