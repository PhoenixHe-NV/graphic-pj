"use strict";

import { gl } from './GLContext';
import { ShaderProgram } from './ShaderProgram'

let program = new ShaderProgram([
  { name: 'a_Position' },
  { name: 'a_Normal' },
  { name: 'u_Color' },
  { name: 'u_NormalMat' },
  { name: 'u_Transform' },
  { name: 'u_SceneLightColor' },
  { name: 'u_SceneLightDirection' }
], `
    attribute vec4 a_Position;
    attribute vec3 a_Normal;
    uniform mat4 u_Transform;
    uniform mat4 u_NormalMat;
    uniform vec3 u_Color;
    uniform vec3 u_SceneLightColor;
    uniform vec3 u_SceneLightDirection;

    varying vec4 v_Color;

    void main() {
      gl_Position = u_Transform * a_Position;

      vec3 invLight = normalize(vec3(u_NormalMat * vec4(u_SceneLightDirection, 1.0)));
      float diffuse = max(dot(normalize(a_Normal), invLight), 0.0);
      v_Color = vec4(u_SceneLightColor * diffuse * 2.0 + u_Color * 0.5, 1.0);
    }
`, [
], `
    #ifdef GL_ES
    precision mediump float;
    #endif

    varying vec4 v_Color;

    void main() {
      gl_FragColor = v_Color;
    }
`);

export class ObjEntity {

  constructor(config) {
    this.objFilePath = config.objFilePath;
    this.color = new Float32Array(config.color);
    this.vertexBuffer = gl.createBuffer();
    this.normalBuffer = gl.createBuffer();
    this.indexBuffer = gl.createBuffer();

    this.transform = new Matrix4();
    for (let t of config.transform) {
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
      //let v = this.drawingInfo.vertices;
      //let n = this.drawingInfo.normals;
      //this.data = new Float32Array(v.length * 2);
      //for (let idx = 0; idx < v.length; idx += 3) {
      //  this.data[idx*2] = v[idx];
      //  this.data[idx*2+1] = v[idx+1];
      //  this.data[idx*2+2] = v[idx+2];
      //  this.data[idx*2+3] = n[idx];
      //  this.data[idx*2+4] = n[idx+1];
      //  this.data[idx*2+5] = n[idx+2];
      //}

      this.loadComplete = true;
    };

    request.open('GET', this.objFilePath, true);
    request.send();
  }

  render(transform, sceneLight) {
    if (!this.loadComplete) {
      return;
    }

    let drawingInfo = this.drawingInfo;

    transform = new Matrix4(transform).concat(this.transform);
    let normalMat = new Matrix4().setInverseOf(this.transform);

    program.loadProgram();

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(program.args.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.args.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(program.args.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.args.a_Normal);

    gl.uniformMatrix4fv(program.args.u_Transform, false, transform.elements);
    gl.uniformMatrix4fv(program.args.u_NormalMat, false, normalMat.elements);
    gl.uniform3fv(program.args.u_Color, this.color);
    gl.uniform3fv(program.args.u_SceneLightColor, sceneLight.color);
    gl.uniform3fv(program.args.u_SceneLightDirection, sceneLight.direction);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

    gl.drawElements(gl.TRIANGLES, drawingInfo.indices.length, gl.UNSIGNED_SHORT, 0);
  }
}