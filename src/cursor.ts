export interface Point {
  r: number;
  c: number;
}

function compare(p1: Point, p2: Point): number {
  if (p1.r === p2.r) {
    return p1.c - p2.c;
  }
  return p1.r - p2.r;
}

export class Cursor {
  p: Point = { r: 0, c: 0 };
  sp: Point = { r: 0, c: 0 };

  cancelSelection() {
    this.sp = { ...this.p };
  }

  get start(): Point {
    return compare(this.p, this.sp) > 0 ? this.sp : this.p;
  }

  get end(): Point {
    return compare(this.p, this.sp) < 0 ? this.sp : this.p;
  }

  get c() {
    return this.p.c;
  }
  set c(v: number) {
    this.p.c = v;
  }

  get r() {
    return this.p.r;
  }
  set r(v: number) {
    this.p.r = v;
  }
}
