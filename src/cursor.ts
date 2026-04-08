export class Cursor {
  offset = 0;
  anchor = 0;

  get selStart() {
    return Math.min(this.offset, this.anchor);
  }

  get selEnd() {
    return Math.max(this.offset, this.anchor);
  }

  get hasSelection() {
    return this.offset !== this.anchor;
  }

  cancelSelection() {
    this.anchor = this.offset;
  }
}
