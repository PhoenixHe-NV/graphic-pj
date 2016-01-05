"use strict";

import { MainController } from './MainController'
import { TextureEntity } from './TextureEntity'
import { ObjEntity } from './ObjEntity'
import { gl } from './GLContext'
import { Camera } from './Camera'
import * as Scene from './Scene'

let controller = new MainController();

controller.addEntity(new TextureEntity(Scene.floorRes, {glID: gl.TEXTURE0, ID: 0}));
controller.addEntity(new TextureEntity(Scene.boxRes, {glID: gl.TEXTURE1, ID: 1}));

for (let obj of Scene.ObjectList) {
  controller.addEntity(new ObjEntity(obj));
}

controller.setCamera(new Camera(Scene.CameraPara));
controller.setSceneLight({
  direction: new Float32Array(Scene.sceneDirectionLight),
  color: new Float32Array(Scene.sceneAmbientLight)
});

controller.startAnimation();

//setTimeout(() => {
//  controller.render();
//}, 100);

