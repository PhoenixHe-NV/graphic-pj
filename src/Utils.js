"use strict";

export function extend(dst, src) {
  for (let key in src) {
    if (src.hasOwnProperty(key) && !dst.hasOwnProperty(key)) {
      dst[key] = src[key];
    }
  }
}

