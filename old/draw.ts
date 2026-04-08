import { Cursor } from "./cursor";
export const fontsize = 13;
export const lineHeight = 13 * 1.5;

export function setupTextDrawStyle(ctx: CanvasRenderingContext2D) {
  ctx.font = '13px "Courier New", monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillStyle = "rgba(0,0,0,1.0)";
}

export function redraw(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  cursor: Cursor,
  offset: number,
  input: HTMLTextAreaElement
) {
  ctx.clearRect(0, 0, 400, 300);

  const thisLine = lines[cursor.r] ? lines[cursor.r] : "";
  const m = thisLine.slice(0, cursor.c);
  const measure = ctx.measureText(m);

  lines.forEach((item, i) => {
    ctx.fillStyle = `hsl(${(i + offset) * 10}, 100%, 80%)`;

    //selection
    drawSelection(ctx, i, item, cursor);

    drawTextLine(ctx, item, i);
  });
  drawCursor(ctx, measure, cursor);
  input.style.left = `${measure.width}px`;
  input.style.top = `${cursor.r * lineHeight}px`;
}

export function drawTextLine(
  ctx: CanvasRenderingContext2D,
  item: string,
  i: number
) {
  ctx.fillStyle = "black";
  ctx.fillText(item, 0, i * lineHeight + (lineHeight - fontsize) / 2);
}

export function drawSelection(
  ctx: CanvasRenderingContext2D,
  i: number,
  item: string,
  cursor: Cursor
) {
  if (cursor.start.r === i && cursor.end.r === i) {
    const s = ctx.measureText(item.slice(0, cursor.start.c));
    const m = ctx.measureText(item.slice(cursor.start.c, cursor.end.c));
    ctx.fillRect(s.width, lineHeight * i, m.width, lineHeight);
  } else if (cursor.start.r === i) {
    const s = ctx.measureText(item.slice(0, cursor.start.c));
    const m = ctx.measureText(item.slice(cursor.start.c));
    ctx.fillRect(s.width, lineHeight * i, m.width, lineHeight);
  } else if (cursor.end.r === i) {
    const s = ctx.measureText(item.slice(0, cursor.end.c));
    ctx.fillRect(0, lineHeight * i, s.width, lineHeight);
  }
  if (cursor.end.r > i && cursor.start.r < i) {
    const m2 = ctx.measureText(item);
    ctx.fillRect(0, lineHeight * i, m2.width, lineHeight);
  }
}

export function drawCursor(
  ctx: CanvasRenderingContext2D,
  measure: TextMetrics,
  cursor: Cursor
) {
  ctx.beginPath();
  ctx.moveTo(measure.width + 0.5, cursor.r * lineHeight);
  ctx.lineTo(measure.width + 0.5, cursor.r * lineHeight + lineHeight);
  ctx.stroke();
}
