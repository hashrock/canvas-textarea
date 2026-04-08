export class Point {
  c: number = 0;
  r: number = 0;
}

function compare(p1: Point, p2: Point) {
  if (p1.r === p2.r) {
    return p1.c - p2.c;
  }
  return p1.r - p2.r;
}

export class Cursor {
  p: Point = new Point();
  sp: Point = new Point();

  cancelSelection() {
    this.sp = { ...this.p };
  }

  get start() {
    return compare(this.p, this.sp) > 0 ? this.sp : this.p;
  }
  get end() {
    return compare(this.p, this.sp) < 0 ? this.sp : this.p;
  }

  get c() {
    return this.p.c;
  }
  set c(v) {
    this.p.c = v;
  }
  get r() {
    return this.p.r;
  }
  set r(v) {
    this.p.r = v;
  }
}
