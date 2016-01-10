"use strict";

import { gl } from './GLContext'
import { ShaderProgramBase } from './ShaderProgramBase'
import { sceneAmbientLight, sceneDirectionLight, scenePointLightColor, CameraPara, flashLight } from './Scene'

let vShaderLibArgs = [
  { name: 'u_LightMat' }
];
let vShaderLibHeader = `
    #ifdef GL_ES
    precision highp float;
    #endif

    uniform bool u_RenderShadow;
    uniform mat4 u_LightMat;

    varying vec4 v_LightPosition;
    varying vec3 v_Normal;
    varying vec4 v_ShadowPosition;
`;

let vShaderLib0 = `
    void init_light(vec4 position, vec3 normal) {
      v_ShadowPosition = u_LightMat * position;
      gl_Position = v_ShadowPosition;
    }
`;

let vShaderLib1 = `
    void init_light(vec4 position, vec3 normal) {
      v_ShadowPosition = u_LightMat * position;
      v_LightPosition = position;
      v_Normal = normalize(normal);
    }
`;

let fShaderLibArgs = [
  { name: 'u_SceneLightColor' },
  { name: 'u_SceneLightDirection' },
  { name: 'u_PointLightColor' },
  { name: 'u_PointLightPosition' },
  { name: 'u_ShadowSampler' }
];
let fShaderLibHeader = `
    #ifdef GL_ES
    precision mediump float;
    #endif

    uniform vec3 u_SceneLightColor;
    uniform vec3 u_SceneLightDirection;
    uniform vec3 u_PointLightColor;
    uniform vec3 u_PointLightPosition;
    uniform bool u_RenderShadow;
    uniform sampler2D u_ShadowSampler;

    varying vec4 v_LightPosition;
    varying vec3 v_Normal;
    varying vec4 v_ShadowPosition;
`;

let fShaderLib0 = `
    void calc_light(vec4 color) {
      gl_FragColor = vec4(v_ShadowPosition.zzz, 1.0);
      //gl_FragColor = color;
    }
`;

let fShaderLib1 = `
    void calc_light(vec4 color) {
      float diffuse = max(-dot(v_Normal, u_SceneLightDirection), 0.0);

      vec4 light = vec4(u_SceneLightColor, 1.0) * color;

      //vec3 offset = u_PointLightPosition - vec3(v_LightPosition) ;
      //float dist = dot(offset, offset);
      //dist = dist * sqrt(dist);
      //diffuse = max(-dot(v_Normal, normalize(offset)) * 5000.0 / dist, 0.0);
      //diffuse = min(diffuse, 1.0);
      //light = light + vec4(u_PointLightColor * diffuse, 1.0) * color;

      vec2 lightUV = v_ShadowPosition.xy / v_ShadowPosition.w * 0.5 + 0.5;
      if (lightUV.x > 0.0) {
        float shadowDist = texture2D(u_ShadowSampler, lightUV).z;
        light = light + ((shadowDist + 0.002 < v_ShadowPosition.z) ? vec4(0.0, 0.0, 0.0, 1.0) : diffuse * color);
      } else {
        light = light + diffuse * color;
      }
      gl_FragColor = light;
      //gl_FragColor = vec4(shadowDist, shadowDist, shadowDist, 1.0);
      //gl_FragColor = texture2D(u_ShadowSampler, v_ShadowPosition.xy / v_ShadowPosition.w * 0.5 + 0.5);
    }
`;

let libArgs = vShaderLibArgs.concat(fShaderLibArgs);

let sceneLight = {
  direction: new Vector3(sceneDirectionLight).normalize(),
  color: new Float32Array(sceneAmbientLight)
};

let lightUp = new Vector3([0, 1, 0]).cross(sceneLight.direction).normalize();


let eye = new Vector3(CameraPara.eye).plus(new Vector3(sceneLight.direction).mul(128));
let at = new Vector3(eye).minus(sceneLight.direction);
//let eye = new Vector3([0, 0, 0]).plus(new Vector3(sceneLight.direction).mul(128));
let mat = new Matrix4().setOrtho(-25, 16, -32, 32, -256, 256)
    .lookAt(eye.elements[0], eye.elements[1], eye.elements[2],
        at.elements[0], at.elements[1], at.elements[2],
        lightUp.elements[0], lightUp.elements[1], lightUp.elements[2])
    .translate(10, 0, 60);

export class ShaderProgram {

  constructor(vShaderArgs, vShaderCode, fShaderArgs, fShaderCode) {
    let args = libArgs.concat(vShaderArgs).concat(fShaderArgs);
    let vShader0 = ShaderProgramBase.initShader(gl.VERTEX_SHADER, vShaderLibHeader + vShaderLib0 + vShaderCode);
    let fShader0 = ShaderProgramBase.initShader(gl.FRAGMENT_SHADER, fShaderLibHeader + fShaderLib0 + fShaderCode);

    let vShader1 = ShaderProgramBase.initShader(gl.VERTEX_SHADER, vShaderLibHeader + vShaderLib1 + vShaderCode);
    let fShader1 = ShaderProgramBase.initShader(gl.FRAGMENT_SHADER, fShaderLibHeader + fShaderLib1 + fShaderCode);

    this.p0 = new ShaderProgramBase(args, [vShader0, fShader0]);
    this.p1 = new ShaderProgramBase(args, [vShader1, fShader1]);
  }

  loadProgram(renderShadow) {
    let p = (renderShadow ? this.p0 : this.p1);
    p.loadProgram();
    return p;
  }

  loadLightArgs(renderShadow) {
    let p = (renderShadow ? this.p0 : this.p1);

    gl.uniform3fv(p.args.u_SceneLightColor, sceneLight.color);
    gl.uniform3fv(p.args.u_SceneLightDirection, sceneLight.direction.elements);
    gl.uniform3fv(p.args.u_PointLightPosition, new Vector3(CameraPara.eye).elements);

    if (flashLight.enable) {
      gl.uniform3fv(p.args.u_PointLightColor, new Float32Array(scenePointLightColor));
    } else {
      gl.uniform3fv(p.args.u_PointLightColor, new Float32Array([0, 0, 0]));
    }

    gl.uniformMatrix4fv(p.args.u_LightMat, false, mat.elements);

    if (!renderShadow) {
      gl.uniform1i(p.args.u_ShadowSampler, 0);
    }
  }

}