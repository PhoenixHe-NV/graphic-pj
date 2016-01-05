"use strict";

import { gl } from './GLContext';
import { ShaderProgram } from './ShaderProgram';

let program = new ShaderProgram([
  { name: 'a_Position', length: 3, size: 3 * Float32Array.BYTES_PER_ELEMENT },
  { name: 'a_TexCoord', length: 2, size: 2 * Float32Array.BYTES_PER_ELEMENT },
  { name: 'u_Transform' }
], `
        attribute vec4 a_Position;
        attribute vec2 a_TexCoord;
        uniform mat4 u_Transform;
        varying vec2 v_TexCoord;

        void main() {
          gl_Position = u_Transform * a_Position;
          v_TexCoord = a_TexCoord;
        }
`, [
  { name: 'u_Sampler' }
], `
        #ifdef GL_ES
        precision mediump float;
        #endif

        uniform sampler2D u_Sampler;
        varying vec2 v_TexCoord;

        void main() {
          gl_FragColor = texture2D(u_Sampler, v_TexCoord);
        }
`);

export class TextureEntity {

  constructor(config, textureID) {
    this.config = config;
    this.textureID = textureID;
    this.buffer = gl.createBuffer();
    this.transform = new Matrix4().translate(config.translate[0], config.translate[1], config.translate[2])
                                  .scale(config.scale[0], config.scale[1], config.scale[2]);
    this.loadTexture(textureID);
    this.loadData();

  }

  loadData() {
    let data = [];

    for (let idx of this.config.index) {
      data = data.concat(this.config.vertex.slice(idx * 3, idx * 3 + 3));
      data = data.concat(this.config.texCoord.slice(idx * 2, idx * 2 + 2));
    }

    this.data = new Float32Array(data);
    this.drawSize = this.config.index.length;
  }

  loadTexture() {
    this.loadComplete = false;
    var image = new Image();  // Create the image object
    image.onload = () => {
      program.loadProgram();

      var texture = gl.createTexture();

      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
      gl.activeTexture(this.textureID.glID);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);

      this.loadComplete = true;
    };

    image.src = this.config.texImagePath;
  }

  render(transform) {
    if (!this.loadComplete) {
      console.warn('TextureEntity not ready!');
      return;
    }

    transform = new Matrix4(transform).concat(this.transform);

    program.loadProgram();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.STATIC_DRAW);
    program.loadVaArgs();

    gl.uniform1i(program.args.u_Sampler, this.textureID.ID);
    gl.uniformMatrix4fv(program.args.u_Transform, false, transform.elements);

    //console.log(transform.elements);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.drawSize);
  }
}