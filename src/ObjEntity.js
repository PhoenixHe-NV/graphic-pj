"use strict";

import { gl } from './GLContext';
import { ShaderProgram } from './ShaderProgram'

let program = new ShaderProgram([
  { name: 'a_Position' },
  { name: 'a_Normal' },
  { name: 'u_ModelMat' },
  { name: 'u_Transform' }
], `
    attribute vec4 a_Position;
    attribute vec3 a_Normal;
    uniform mat4 u_Transform;
    uniform mat4 u_ModelMat;

    void main() {
      gl_Position = u_Transform * a_Position;
      init_light(u_ModelMat * a_Position, (u_ModelMat * vec4(a_Normal, 0.0)).xyz);
    }
`, [
  { name: 'u_Color' }
], `
    uniform vec3 u_Color;

    void main() {
      gl_FragColor = calc_light(vec4(u_Color, 1.0));
    }
`);

export class ObjEntity {

  constructor(config) {
    this.config = config;
    this.objFilePath = config.objFilePath;
    this.color = new Float32Array(config.color);
    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    this.transform = new Matrix4();
    for (let t of this.config.transform) {
      this.transform[t.type].apply(this.transform, t.content);
    }

    this.loadObj();
  }

  loadObj() {
    this.loadComplete = false;
    let request = new XMLHttpRequest();

    request.onreadystatechange = () => {
      if (request.readyState !== 4 || request.status == 404 || this.loadComplete) {
        return;
      }

      this.objDoc = new OBJDoc(this.objFilePath);  // Create a OBJDoc object
      let result = this.objDoc.parse(request.responseText, 1.0, false); // Parse the file
      if (!result) {
        console.log("OBJ file parsing error.");
        return;
      }

      this.drawingInfo = this.objDoc.getDrawingInfo();
      this.loadComplete = true;
    };

    request.open('GET', this.objFilePath, true);
    request.send();
  }

  render(transform) {
    if (!this.loadComplete) {
      return;
    }

    let drawingInfo = this.drawingInfo;

    transform = new Matrix4(transform).concat(this.transform);

    program.loadProgram();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(program.args.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.args.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(program.args.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.args.a_Normal);

    gl.uniformMatrix4fv(program.args.u_Transform, false, transform.elements);
    gl.uniformMatrix4fv(program.args.u_ModelMat, false, this.transform.elements);
    gl.uniform3fv(program.args.u_Color, this.color);

    program.loadLightArgs();

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
  }
}