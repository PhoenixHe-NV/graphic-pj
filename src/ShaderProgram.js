"use strict";

import { gl } from './GLContext'
import { ShaderProgramBase } from './ShaderProgramBase'
import { sceneAmbientLight, sceneDirectionLight, scenePointLightColor, CameraPara, flashLight } from './Scene'

let vShaderLibArgs = [
];
let vShaderLib = `
    #ifdef GL_ES
    precision highp float;
    #endif

    varying vec4 v_Position;
    varying vec3 v_Normal;

    void init_light(vec4 position, vec3 normal) {
      v_Position = position;
      v_Normal = normalize(normal);
    }
`;

let fShaderLibArgs = [
  { name: 'u_SceneLightColor' },
  { name: 'u_SceneLightDirection' },
  { name: 'u_PointLightColor' },
  { name: 'u_PointLightPosition' }
];
let fShaderLib = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec3 u_SceneLightColor;
    uniform vec3 u_SceneLightDirection;
    uniform vec3 u_PointLightColor;
    uniform vec3 u_PointLightPosition;

    varying vec4 v_Position;
    varying vec3 v_Normal;

    vec4 calc_light(vec4 color) {
      float diffuse = max(-dot(v_Normal, u_SceneLightDirection), 0.0);
      vec4 light = color * diffuse + vec4(u_SceneLightColor, 1.0) * color;

      vec3 offset = u_PointLightPosition - vec3(v_Position) ;
      float dist = dot(offset, offset);
      dist = dist * sqrt(dist);
      diffuse = max(-dot(v_Normal, normalize(offset)) * 50000.0 / dist, 0.0);
      diffuse = min(diffuse, 1.0);
      light = light + vec4(u_PointLightColor * diffuse, 1.0) * color;

      return light;
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
    let at = new Vector3(CameraPara.at);
    at.plus(at).minus(new Vector3(CameraPara.eye));
    gl.uniform3fv(this.args.u_PointLightPosition, new Vector3(CameraPara.eye).elements);

    if (flashLight.enable) {
      gl.uniform3fv(this.args.u_PointLightColor, new Float32Array(scenePointLightColor));
    } else {
      gl.uniform3fv(this.args.u_PointLightColor, new Float32Array([0, 0, 0]));
    }
  }

}