"use strict";

import { gl } from './GLContext'
import { ShaderProgramBase } from './ShaderProgramBase'
import { sceneAmbientLight, sceneDirectionLight, scenePointLightColor, CameraPara, flashLight } from './Scene'

let vShaderLibArgs = [
  { name: 'u_RenderShadow' }
];
let vShaderLibSrc = `
    #ifdef GL_ES
    precision highp float;
    #endif

    uniform bool u_RenderShadow;

    varying vec4 v_LightPosition;
    varying vec3 v_Normal;

    void init_light(vec4 position, vec3 normal) {
      if (u_RenderShadow) {

      } else {
        v_LightPosition = position;
        v_Normal = normalize(normal);
      }
    }
`;

let fShaderLibArgs = [
  { name: 'u_SceneLightColor' },
  { name: 'u_SceneLightDirection' },
  { name: 'u_PointLightColor' },
  { name: 'u_PointLightPosition' }
];
let fShaderLibSrc = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec3 u_SceneLightColor;
    uniform vec3 u_SceneLightDirection;
    uniform vec3 u_PointLightColor;
    uniform vec3 u_PointLightPosition;
    uniform bool u_RenderShadow;

    varying vec4 v_LightPosition;
    varying vec3 v_Normal;

    vec4 calc_light(vec4 color) {
      if (u_RenderShadow) {
        return vec4(0.0, 0.0, 0.0, 0.0);

      } else {
        float diffuse = max(-dot(v_Normal, u_SceneLightDirection), 0.0);
        vec4 light = color * diffuse + vec4(u_SceneLightColor, 1.0) * color;

        vec3 offset = u_PointLightPosition - vec3(v_LightPosition) ;
        float dist = dot(offset, offset);
        dist = dist * sqrt(dist);
        diffuse = max(-dot(v_Normal, normalize(offset)) * 5000.0 / dist, 0.0);
        diffuse = min(diffuse, 1.0);
        light = light + vec4(u_PointLightColor * diffuse, 1.0) * color;

        return light;
      }
    }
`;

let libArgs = vShaderLibArgs.concat(fShaderLibArgs);

let sceneLight = {
  direction: new Vector3(sceneDirectionLight).normalize().elements,
  color: new Float32Array(sceneAmbientLight)
};


export class ShaderProgram extends ShaderProgramBase {

  constructor(vShaderArgs, vShaderCode, fShaderArgs, fShaderCode) {
    let vShader = ShaderProgramBase.initShader(gl.VERTEX_SHADER, vShaderLibSrc + vShaderCode);
    let fShader = ShaderProgramBase.initShader(gl.FRAGMENT_SHADER, fShaderLibSrc + fShaderCode);

    super(libArgs.concat(vShaderArgs).concat(fShaderArgs), [vShader, fShader]);
  }

  loadLightArgs(renderShadow) {
    gl.uniform3fv(this.args.u_SceneLightColor, sceneLight.color);
    gl.uniform3fv(this.args.u_SceneLightDirection, sceneLight.direction);
    gl.uniform3fv(this.args.u_PointLightPosition, new Vector3(CameraPara.eye).elements);
    gl.uniform1i(this.args.u_RenderShadow, renderShadow);

    if (flashLight.enable) {
      gl.uniform3fv(this.args.u_PointLightColor, new Float32Array(scenePointLightColor));
    } else {
      gl.uniform3fv(this.args.u_PointLightColor, new Float32Array([0, 0, 0]));
    }
  }

}