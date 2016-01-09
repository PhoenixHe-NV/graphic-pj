"use strict";

let infoBoard = document.getElementById('info');

export class Camera {

  constructor(config) {
    this.config = config;
    this.fov = config.fov;
    this.near = config.near;
    this.far = config.far;
    this.aspect = config.aspect;
    this.eye = new Vector3(config.eye);
    this.at = new Vector3(config.at);
    this.up = new Vector3(config.up).normalize();

    //let v = new Vector3(this.at).minus(this.eye);
    //this.at = new Vector3(this.eye).plus(v.normalize());

    this.updateInfo();
  }

  getTrans() {
    return new Matrix4()
        .perspective(this.fov, this.aspect, this.near, this.far)
        .lookAt(this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
                this.at.elements[0], this.at.elements[1], this.at.elements[2],
                this.up.elements[0], this.up.elements[1], this.up.elements[2]);
  }

  move(x, y) {
    if (x == 0 && y == 0) {
      return;
    }

    let v = new Vector3(this.eye).minus(this.at).normalize();
    let w = v.cross(this.up);
    v.mul(x); w.mul(y); v.plus(w);
    this.at.minus(v);
    this.eye.minus(v);
    this.updateInfo();
  }

  moveCam(x, y) {
    if (x == 0 && y == 0) {
      return;
    }

    let v = new Vector3(this.at).minus(this.eye);
    let w = v.cross(this.up);

    this.at.minus(new Vector3(this.up).mul(-x)).plus(new Vector3(w).mul(y));
    v = new Vector3(this.at).minus(this.eye);
    this.at = new Vector3(this.eye).plus(v.normalize());

    this.up = w.cross(v).normalize();
    this.updateInfo();
  }

  updateInfo() {
    infoBoard.innerText = "message:" +
        "\nposition: " + this.eye.elements[0].toFixed(2) + " , " + this.eye.elements[1].toFixed(1) + " , " + this.eye.elements[2].toFixed(2) +
        "\nlook at: " + this.at.elements[0].toFixed(2) + " , " + this.at.elements[1].toFixed(1) + " , " + this.at.elements[2].toFixed(2);
    this.config.at = this.at;
    this.config.eye = this.eye;
    this.config.up = this.up;
  }

}