"use strict";

let infoBoard = document.getElementById('info');

export class Camera {

  constructor(config) {
    this.fov = config.fov;
    this.near = config.near;
    this.far = config.far;
    this.eye = new Vector3(config.eye);
    this.at = new Vector3(config.at);
    this.up = new Vector3(config.up).normalize();
    this.vlen = 5.0;

    let v = new Vector3(this.eye).minus(this.at);
    this.eye = new Vector3(this.at).plus(v.normalize().mul(this.vlen));

    this.updateInfo();
  }

  getTrans() {
    return new Matrix4()
        .perspective(this.fov, 1.0, this.near, this.far)
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

    let v = new Vector3(this.eye).minus(this.at).normalize();
    let w = v.cross(this.up);

    this.eye.minus(new Vector3(this.up).mul(x * this.vlen)).plus(new Vector3(w).mul(y * this.vlen));
    v = new Vector3(this.eye).minus(this.at);
    this.eye = new Vector3(this.at).plus(v.normalize().mul(this.vlen));

    this.up = w.cross(v).normalize();
    this.updateInfo();
  }

  updateInfo() {
    infoBoard.innerText = "message:" +
        "\nposition: " + this.at.elements[0].toFixed(2) + " , " + this.at.elements[1].toFixed(1) + " , " + this.at.elements[2].toFixed(2) +
        "\nlook at: " + this.eye.elements[0].toFixed(2) + " , " + this.eye.elements[1].toFixed(1) + " , " + this.eye.elements[2].toFixed(2);
  }

}