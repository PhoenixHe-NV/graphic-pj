"use strict";

import { ObjEntity } from "./ObjEntity"

export class BirdEntity extends ObjEntity {
  
  constructor(config) {
    super(config);

    this.offset0 = 0;
    this.offset1 = 0;
    this.rotate = config.transform[1].content;
    this.translate = config.transform[2].content;
  }

  nextFrame(elapsed) {
    this.offset0 += elapsed * 90;
    this.offset0 %= 360;
    this.offset1 += elapsed * Math.PI;
    this.offset1 %= 2 * Math.PI;

    this.rotate[0] = this.offset0;
    this.translate[1] = Math.sin(this.offset1) * 5;
  }

  render(transform) {
    this.transform = new Matrix4();
    for (let t of this.config.transform) {
      this.transform[t.type].apply(this.transform, t.content);
    }

    super.render(transform);
  }
}