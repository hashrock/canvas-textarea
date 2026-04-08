import { prepareWithSegments, layoutWithLines } from "@chenglou/pretext";

export const FONT = '13px "Courier New", monospace';
export const FONT_SIZE = 13;
export const LINE_HEIGHT = Math.round(FONT_SIZE * 1.5);

export interface VisualLine {
  text: string;
  width: number;
  startOffset: number;
}

export interface TextLayout {
  visualLines: VisualLine[];
}

export function computeLayout(
  text: string,
  maxWidth: number
): TextLayout {
  if (text === "") {
    return { visualLines: [{ text: "", width: 0, startOffset: 0 }] };
  }

  const prepared = prepareWithSegments(text, FONT, {
    whiteSpace: "pre-wrap",
  });
  const { lines } = layoutWithLines(prepared, maxWidth, LINE_HEIGHT);

  const visualLines: VisualLine[] = [];
  let charPos = 0;

  for (const line of lines) {
    visualLines.push({
      text: line.text,
      width: line.width,
      startOffset: charPos,
    });
    charPos += line.text.length;
    // Skip \n for hard breaks
    if (charPos < text.length && text[charPos] === "\n") {
      charPos++;
    }
  }

  return { visualLines };
}

/** Find which visual line an absolute offset falls on */
export function visualLineForOffset(
  layout: TextLayout,
  offset: number
): number {
  const lines = layout.visualLines;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (offset >= lines[i].startOffset) {
      return i;
    }
  }
  return 0;
}

/** Convert (visualRow, localCol) to absolute offset */
export function toAbsoluteOffset(
  layout: TextLayout,
  row: number,
  col: number
): number {
  const line = layout.visualLines[row];
  return line.startOffset + Math.min(col, line.text.length);
}

/** Convert absolute offset to { row, col } in visual lines */
export function toVisualPosition(
  layout: TextLayout,
  offset: number
): { row: number; col: number } {
  const row = visualLineForOffset(layout, offset);
  const line = layout.visualLines[row];
  const col = Math.min(offset - line.startOffset, line.text.length);
  return { row, col };
}
