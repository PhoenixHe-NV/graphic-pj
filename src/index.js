"use strict";

import {
    canvasSize, vertex_pos, vertex_color, polygon
} from './config'

window.onload = () => {

  let Enum = (obj) => {
    const keysByValue = new Map();
    const EnumLookup = value => keysByValue.get(value);

    for (const key of Object.keys(obj)){
      EnumLookup[key] = obj[key];
      keysByValue.set(EnumLookup[key], key);
    }

    return Object.freeze(EnumLookup);
  };

  class ShaderProgram {
    constructor(gl, vShaderArgs, vShaderCode, fShaderArgs, fShaderCode) {
      this.gl = gl;
      this.program = gl.createProgram();

      let vShader = this.initShader(gl.VERTEX_SHADER, vShaderCode);
      let fShader = this.initShader(gl.FRAGMENT_SHADER, fShaderCode);
      gl.attachShader(this.program, vShader);
      gl.attachShader(this.program, fShader);
      gl.linkProgram(this.program);
      let linked = gl.getProgramParameter(this.program, gl.LINK_STATUS);
      if (!linked) {
        let error = gl.getProgramInfoLog(this.program);
        console.log('Failed to link program: ' + error);
        gl.deleteProgram(this.program);
        gl.deleteShader(vShader);
        gl.deleteShader(fShader);
        throw error;
      }

      this.vArgs = this.getShaderArgLocation(this.program, vShaderArgs);
      this.fArgs = this.getShaderArgLocation(this.program, fShaderArgs);
    }

    getShaderArgLocation(shader, args) {
      let gl = this.gl;
      let ret = {};

      for (let arg of args) {
        let position = -1;
        switch (arg[0]) {
          case 'u':
            position = gl.getUniformLocation(shader, arg);
            break;
          case 'a':
            position = gl.getAttribLocation(shader, arg);
            break;
          default:
            throw "Unknown shader argument type " + arg;
        }
        ret[arg] = position;

        if (position < 0) {
          console.log('WARN: ArgPosition of ' + arg + ' is ' + position);
        }
      }

      return ret;
    }

    load() {
      this.gl.useProgram(this.program);
    }

    initShader(type, source) {
      let gl = this.gl;
      let shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      let compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
      if (!compiled) {
        var error = gl.getShaderInfoLog(shader);
        console.log('Failed to compile shader: ' + error);
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }
  }


  class TrianglesLineRenderer {
    constructor(gl, viewport) {
      this.gl = gl;
      this.buffer = gl.createBuffer();
      this.program = new ShaderProgram(gl,
          ['a_Position', 'u_Viewport'], `

            attribute vec4 a_Position;
            uniform mat4 u_Viewport;

            void main() {
              gl_Position = u_Viewport * a_Position;
            }
      `,  [], `

            void main() {
              gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            }
      `);
    }

    render(viewport, triangles) {
      let gl = this.gl;
      let vData = Array.prototype.concat.apply([], triangles.map((t) =>
        t.p0.vData.concat(t.p1.vData, t.p1.vData, t.p2.vData, t.p2.vData, t.p0.vData)
      ));
      vData = new Float32Array(vData);

      this.program.load();

      // Load data for position
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vData, gl.STATIC_DRAW);

      gl.vertexAttribPointer(this.program.vArgs.a_Position,
          3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(this.program.vArgs.a_Position);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      // Load data for viewport
      gl.uniformMatrix4fv(this.program.vArgs.u_Viewport,
          false, viewport);


      gl.drawArrays(gl.LINES, 0, triangles.length * 6);
    }
  }


  class TriangleRenderer {
    constructor(gl, viewport) {
      this.gl = gl;
      this.viewport = viewport;
      this.buffer = gl.createBuffer();
      this.program = new ShaderProgram(gl,
          ['a_Position', 'a_Color', 'u_Viewport'], `

            attribute vec4 a_Position;
            attribute vec4 a_Color;
            varying vec4 v_Color;
            uniform mat4 u_Viewport;

            void main() {
              gl_Position = u_Viewport * a_Position;
              v_Color = a_Color;
            }
      `,  [], `

            precision mediump float;
            varying vec4 v_Color;

            void main() {
              gl_FragColor = v_Color;
            }
      `);
    }

    render(viewport, triangles) {
      let gl = this.gl;
      let data = Array.prototype.concat.apply([], triangles.map((t) => t.vcData));
      data = new Float32Array(data);
      let FSIZE = data.BYTES_PER_ELEMENT;

      this.program.load();

      // Load data for position and color
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

      gl.vertexAttribPointer(this.program.vArgs.a_Position,
          3, gl.FLOAT, false, FSIZE * 6, 0);
      gl.enableVertexAttribArray(this.program.vArgs.a_Position);

      gl.vertexAttribPointer(this.program.vArgs.a_Color,
          3, gl.FLOAT, false, FSIZE * 6, FSIZE * 3);
      gl.enableVertexAttribArray(this.program.vArgs.a_Color);

      gl.bindBuffer(gl.ARRAY_BUFFER, null);

      // Load data for viewport
      gl.uniformMatrix4fv(this.program.vArgs.u_Viewport,
          false, viewport);

      gl.drawArrays(gl.TRIANGLES, 0, triangles.length * 3);
    }
  }


  class PJ2 {

    constructor(canvas, points, triangles, modeSpan, optionCheckbox) {
      this.canvas = canvas;
      this.points = points;
      this.state = PJ2.STATES.EDIT;
      this.triangles = triangles;
      this.gl = WebGLUtils.create3DContext(canvas);
      this.animateWrap = (timestamp) => this.animate(timestamp);
      this.timeElapsed = 0;

      this.initGl();
      this.initKey();
      this.initMouse();
      this.initInterface(modeSpan, optionCheckbox);

      this.render();
    }

    static get STATES() {
      return {
        EDIT: 0,
        ANIMATE: 1,
        ANIMATE_STOP: 2
      };
    }

    render() {
      let gl = this.gl;

      this.clear();
      // Do not change viewport when in edit mode and not editOnAnimate
      if (!(!this.editOnAnimate && this.state == PJ2.STATES.EDIT)) {
        this.viewport = new Matrix4().setRotate(this.timeElapsed / 1000 * 45, 0, 0, 1)
            .multiply(this.viewport);
        let scaleLevel = ((this.timeElapsed / 2000) % 4) / 2;
        if (scaleLevel > 1) {
          scaleLevel = 2 - scaleLevel;
        }
        scaleLevel = 1 - 0.8 * scaleLevel;
        this.viewport = new Matrix4().setScale(scaleLevel, scaleLevel, 1)
            .multiply(this.viewport);

      }

      let vp = this.viewport.elements;
      let ts = this.triangles;

      this.trianglesLineRenderer.render(vp, ts);
      this.trianglesRenderer.render(vp, ts);
    }

    getMappedPosition(clientX, clientY) {
      let rev = new Matrix4().setInverseOf(this.viewport);
      let x = clientX / this.canvas.height * 2 - 1;
      let y = 1 - clientY / this.canvas.width * 2;
      let result = rev.multiplyVector4(new Vector4([x, y, 0, 1])).elements;
      rev.multiply(this.viewport);
      return {
        x: result[0],
        y: result[1]
      }
    }

    initGl() {
      this.viewport = new Matrix4();

      this.trianglesLineRenderer = new TrianglesLineRenderer(this.gl);
      this.trianglesRenderer = new TriangleRenderer(this.gl);
    }

    clear() {
      let gl = this.gl;
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT);
      this.viewport.setOrtho(0, this.canvas.width, this.canvas.height, 0, -1, 1);
    }

    initInterface(modeSpan, optionCheckbox) {
      this.modeSpan = modeSpan;

      optionCheckbox.addEventListener('click', (ev) => {
        this.editOnAnimate = optionCheckbox.checked;
        if (this.state == PJ2.STATES.EDIT) {
          this.render();
        }
      })
    }

    set state(val) {
      this._state = val;
      if (this.modeSpan) {
        this.modeSpan.innerHTML = ['编辑中', '动画中', '动画停止'][val];
      }
    }

    get state() {
      return this._state;
    }

    initKey() {
      window.addEventListener('keydown', (ev) => {
        switch (ev.keyCode) {
          case "T".charCodeAt(0):
            this.toggleAnimation();
            break;

          case "E".charCodeAt(0):
            this.state = PJ2.STATES.EDIT;
            this.render();
            break;
        }
      });
    }

    initMouse() {
      this.canvas.addEventListener('mousedown', (ev) => {
        if (this.state != PJ2.STATES.EDIT) {
          return;
        }

        this.selected = undefined;
        let mappedPosition = this.getMappedPosition(ev.layerX, ev.layerY);
        let x = mappedPosition.x, y = mappedPosition.y, minDist = 400;
        for (let p of this.points) {
          let offsetX = x - p.x, offsetY = y - p.y;
          let dist = offsetX * offsetX + offsetY * offsetY;
          if (dist < minDist) {
            minDist = dist;
            this.selected = p;
            this.selectOffsetX = offsetX;
            this.selectOffsetY = offsetY;
          }
        }

        if (this.selected) {
          let ts = this.selected.triangles;
          this.triangles.sort((t0, t1) => ts.indexOf(t1) - ts.indexOf(t0));
        }
      });

      this.canvas.addEventListener('mousemove', (ev) => {
        if (this.state != PJ2.STATES.EDIT || !this.selected) {
          return;
        }

        let mappedPosition = this.editOnAnimate ? this.getMappedPosition(ev.layerX, ev.layerY)
                                                : { x: ev.layerX, y: ev.layerY };
        this.selected.x = mappedPosition.x - this.selectOffsetX;
        this.selected.y = mappedPosition.y - this.selectOffsetY;
        this.render();
      });

      this.canvas.addEventListener('mouseup', (ev) => {
        this.selected = undefined;
      });

      this.canvas.addEventListener('mouseout', (ev) => {
        this.selected = undefined;
      });

    }

    toggleAnimation() {
      switch (this.state) {
        case PJ2.STATES.ANIMATE:
          this.state = PJ2.STATES.ANIMATE_STOP;
          // Animation will stop at next frame in animate()
          break;

        case PJ2.STATES.ANIMATE_STOP:
        case PJ2.STATES.EDIT:
          this.state = PJ2.STATES.ANIMATE;
          this.startAnimation();
          break;
      }
    }

    startAnimation() {
      window.requestAnimationFrame(this.animateWrap);
    }

    animate(timestamp) {
      if (this.state != PJ2.STATES.ANIMATE) {
        this.animatePauseTime = timestamp;
        //if (this.state != PJ2.STATES.ANIMATE_STOP) {
        //  this.animatePauseTime = 0;
        //  this.animateStartTime = 0;
        //}
        return;
      }
      if (!this.animateStartTime) {
        this.animateStartTime = timestamp;
      }
      if (this.animatePauseTime) {
        this.animateStartTime += timestamp - this.animatePauseTime;
        this.animatePauseTime = 0;
      }

      this.timeElapsed = timestamp - this.animateStartTime;
      this.render();

      this.startAnimation();
    }
  }


  class Color {
    constructor(r, g, b) {
      this.cData = [r, g ,b];
    }

    get r() {
      return this.cData[0];
    }

    get g() {
      return this.cData[1];
    }

    get b() {
      return this.cData[2];
    }

    set r(val) {
      this.cData[0] = val;
    }

    set g(val) {
      this.cData[1] = val;
    }

    set b(val) {
      this.cData[2] = val;
    }
  }


  class Point {
    constructor(x, y, z, color) {
      this.vData = [x, y ,z];
      this.color = color;
      this.triangles = [];
    }

    get x() {
      return this.vData[0];
    }

    get y() {
      return this.vData[1];
    }

    get z() {
      return this.vData[2];
    }

    get cData() {
      return this.color.cData.map((c) => c / 256);
    }

    get vcData() {
      return this.vData.concat(this.cData);
    }

    set x(val) {
      this.vData[0] = val;
    }

    set y(val) {
      this.vData[1] = val;
    }

    set z(val) {
      this.vData[2] = val;
    }
  }


  class Triangle {
    constructor(p0, p1, p2) {
      this.p0 = p0;
      this.p1 = p1;
      this.p2 = p2;
    }

    get vData() {
      return this.p0.vData.concat(this.p1.vData, this.p2.vData);
    }

    get vcData() {
      return this.p0.vcData.concat(this.p1.vcData, this.p2.vcData);
    }
  }


  // init
  let canvas = document.getElementById('webgl');
  canvas.setAttribute('height', canvasSize.maxX);
  canvas.setAttribute('width', canvasSize.maxY);

  let points = [];
  for (let i = 0; i < vertex_pos.length; ++i) {
    let vp = vertex_pos[i], vc = vertex_color[i];
    points.push(new Point(vp[0], vp[1], vp[2], new Color(vc[0], vc[1], vc[2])));
  }
  let triangles = [];
  for (let p of polygon) {
    let p0 = points[p[0]], p1 = points[p[1]], p2 = points[p[2]], p3 = points[p[3]];
    let t0 = new Triangle(p0, p1, p2), t1 = new Triangle(p0, p3, p2);
    p0.triangles.push(t0, t1);
    p1.triangles.push(t0, t1);
    p2.triangles.push(t0, t1);
    p3.triangles.push(t0, t1);
    triangles.push(t0, t1);
  }

  let pj2 = new PJ2(canvas, points, triangles,
                    document.getElementById('mode'),
                    document.getElementById('editOnAnimation'));
};

