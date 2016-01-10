"use strict";

import { MainController } from './MainController'
import { TextureEntity } from './TextureEntity'
import { ObjEntity } from './ObjEntity'
import { BirdEntity } from './BirdEntity'
import { SkyboxEntity } from './SkyboxEntity'
import { gl } from './GLContext'
import { Camera } from './Camera'
import * as Scene from './Scene'

let controller = new MainController();

controller.addEntity(new SkyboxEntity(Scene.skyBox));
controller.addEntity(new TextureEntity(Scene.floorRes, {glID: gl.TEXTURE1, ID: 1}));
controller.addEntity(new TextureEntity(Scene.boxRes, {glID: gl.TEXTURE2, ID: 2}));

for (let obj of Scene.ObjectList) {
  if (obj.objFilePath == "./model/bird.obj") {
    controller.addEntity(new BirdEntity(obj));
  } else {
    controller.addEntity(new ObjEntity(obj));
  }
}

controller.setCamera(new Camera(Scene.CameraPara));

controller.startAnimation();

//setTimeout(() => {
//  controller.render();
//  setTimeout(() => {
//    controller.render();
//  }, 500);
//}, 500);

