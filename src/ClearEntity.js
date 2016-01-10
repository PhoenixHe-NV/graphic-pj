"use strict";

import { gl } from './GLContext'
import { ShaderProgram } from './ShaderProgram'

let program = new ShaderProgram([
  { name: 'a_Position', length: 2, size: 2 * Float32Array.BYTES_PER_ELEMENT }
], `
    void main() {
      gl_Position = a_Position;
    }
`, [
], `
    void main() {
    }
`);