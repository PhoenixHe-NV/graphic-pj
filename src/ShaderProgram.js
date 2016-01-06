"use strict";

import { gl } from './GLContext'
import { ShaderProgramBase } from './ShaderProgramBase'
import { Camera } from './Camera'
import { sceneAmbientLight, sceneDirectionLight, scenePointLightColor } from './Scene'

let vShaderLibArgs = [
];
let vShaderLib = `
    #ifdef GL_ES
    precision highp float;
    #endif
`;

let fShaderLibArgs = [
  { name: 'u_SceneLightColor' },
  { name: 'u_SceneLightDirection' },
  { name: 'u_PointLightColor' },
  { name: 'u_PointLightDirection' }
];
let fShaderLib = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec3 u_SceneLightColor;
    uniform vec3 u_SceneLightDirection;
    uniform vec3 u_PointLightColor;
    uniform vec3 u_PointLightDirection;

    vec4 calc_light(vec4 color, vec3 normal) {
      float diffuse = max(-dot(normal, u_SceneLightDirection), 0.0);
      return color * diffuse + vec4(u_SceneLightColor, 1.0) * color;
    }
`;

let sceneLight = {
  direction: new Vector3(sceneDirectionLight).normalize().elements,
  color: new Float32Array(sceneAmbientLight)
};


export class ShaderProgram extends ShaderProgramBase {

  constructor(vShaderArgs, vShaderCode, fShaderArgs, fShaderCode) {
    super(vShaderArgs.concat(vShaderLibArgs), vShaderLib + vShaderCode,
          fShaderArgs.concat(fShaderLibArgs), fShaderLib + fShaderCode);
  }

  loadLightArgs() {
    gl.uniform3fv(this.args.u_SceneLightColor, sceneLight.color);
    gl.uniform3fv(this.args.u_SceneLightDirection, sceneLight.direction);
  }
}