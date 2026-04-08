export const FONT_SIZE = 13;
export const LINE_HEIGHT = FONT_SIZE * 1.5;
export function setupTextDrawStyle(ctx) {
    ctx.font = `${FONT_SIZE}px "Courier New", monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(0,0,0,1.0)";
}
export function redraw(ctx, lines, cursor, offset, input) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    const thisLine = lines[cursor.r] ?? "";
    const m = thisLine.slice(0, cursor.c);
    const measure = ctx.measureText(m);
    lines.forEach((item, i) => {
        ctx.fillStyle = `hsl(${(i + offset) * 10}, 100%, 80%)`;
        drawSelection(ctx, i, item, cursor);
        drawTextLine(ctx, item, i);
    });
    drawCursor(ctx, measure, cursor);
    input.style.left = `${measure.width}px`;
    input.style.top = `${cursor.r * LINE_HEIGHT}px`;
}
function drawTextLine(ctx, item, i) {
    ctx.fillStyle = "black";
    ctx.fillText(item, 0, i * LINE_HEIGHT + (LINE_HEIGHT - FONT_SIZE) / 2);
}
function drawSelection(ctx, i, item, cursor) {
    if (cursor.start.r === i && cursor.end.r === i) {
        const s = ctx.measureText(item.slice(0, cursor.start.c));
        const m = ctx.measureText(item.slice(cursor.start.c, cursor.end.c));
        ctx.fillRect(s.width, LINE_HEIGHT * i, m.width, LINE_HEIGHT);
    }
    else if (cursor.start.r === i) {
        const s = ctx.measureText(item.slice(0, cursor.start.c));
        const m = ctx.measureText(item.slice(cursor.start.c));
        ctx.fillRect(s.width, LINE_HEIGHT * i, m.width, LINE_HEIGHT);
    }
    else if (cursor.end.r === i) {
        const s = ctx.measureText(item.slice(0, cursor.end.c));
        ctx.fillRect(0, LINE_HEIGHT * i, s.width, LINE_HEIGHT);
    }
    if (cursor.end.r > i && cursor.start.r < i) {
        const m2 = ctx.measureText(item);
        ctx.fillRect(0, LINE_HEIGHT * i, m2.width, LINE_HEIGHT);
    }
}
function drawCursor(ctx, measure, cursor) {
    ctx.beginPath();
    ctx.moveTo(measure.width + 0.5, cursor.r * LINE_HEIGHT);
    ctx.lineTo(measure.width + 0.5, cursor.r * LINE_HEIGHT + LINE_HEIGHT);
    ctx.stroke();
}
