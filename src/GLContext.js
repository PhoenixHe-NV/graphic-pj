"use strict";

let canvas = document.getElementById('webgl');
let gl = WebGLUtils.create3DContext(canvas);

export {
  gl, canvas
};
