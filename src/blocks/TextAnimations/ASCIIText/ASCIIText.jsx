import React, { useEffect } from "react";
import { useRef } from "react";
import * as THREE from "three";

const vertexShader = `
varying vec2 vUv;
uniform float uTime;
uniform float mouse;
uniform float uEnableWaves;
uniform vec2 uResolution;

void main() {
    vUv = uv;
    float time = uTime * 5.;

    float waveFactor = uEnableWaves;

    vec3 transformed = position;

    // Reduce wave intensity to prevent excessive clipping
    transformed.x += sin(time + position.y) * 0.3 * waveFactor;
    transformed.y += cos(time + position.z) * 0.1 * waveFactor;
    transformed.z += sin(time + position.x) * 0.5 * waveFactor;

    vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec2 vUv;
uniform float mouse;
uniform float uTime;
uniform sampler2D uTexture;

void main() {
    float time = uTime;
    vec2 pos = vUv;
    
    float move = sin(time + mouse) * 0.01;
    float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * .01).r;
    float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * .01).g;
    float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * .01).b;
    float a = texture2D(uTexture, pos).a;
    gl_FragColor = vec4(r, g, b, a);
}
`;

Math.map = function (n, start, stop, start2, stop2) {
  return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
};

const PX_RATIO = typeof window !== "undefined" ? window.devicePixelRatio : 1;

class AsciiFilter {
  constructor(renderer, { fontSize, fontFamily, charset, invert } = {}) {
    this.renderer = renderer;
    this.domElement = document.createElement("div");
    this.domElement.style.position = "absolute";
    this.domElement.style.top = "0";
    this.domElement.style.left = "0";
    this.domElement.style.width = "100%";
    this.domElement.style.height = "100%";
    this.domElement.style.overflow = "visible";

    this.pre = document.createElement("pre");
    this.domElement.appendChild(this.pre);

    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
    this.domElement.appendChild(this.canvas);

    this.deg = 0;
    this.invert = invert ?? true;
    this.fontSize = fontSize ?? 12;
    this.fontFamily = fontFamily ?? "'Courier New', monospace";
    this.charset =
      charset ??
      " .'`^\",:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

    this.context.webkitImageSmoothingEnabled = false;
    this.context.mozImageSmoothingEnabled = false;
    this.context.msImageSmoothingEnabled = false;
    this.context.imageSmoothingEnabled = false;

    this.onMouseMove = this.onMouseMove.bind(this);
    document.addEventListener("mousemove", this.onMouseMove);
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.reset();

    this.center = { x: width / 2, y: height / 2 };
    this.mouse = { x: this.center.x, y: this.center.y };
  }

  reset() {
    this.context.font = `${this.fontSize}px ${this.fontFamily}`;
    const charWidth = this.context.measureText("A").width;

    this.cols = Math.floor(
      this.width / (this.fontSize * (charWidth / this.fontSize)),
    );
    this.rows = Math.floor(this.height / this.fontSize);

    this.canvas.width = this.cols;
    this.canvas.height = this.rows;
    this.pre.style.fontFamily = this.fontFamily;
    this.pre.style.fontSize = `${this.fontSize}px`;
    this.pre.style.margin = "0";
    this.pre.style.padding = "0";
    this.pre.style.lineHeight = "1em";
    this.pre.style.position = "absolute";
    this.pre.style.left = "0";
    this.pre.style.top = "0";
    this.pre.style.zIndex = "9";
    this.pre.style.backgroundAttachment = "fixed";
    this.pre.style.mixBlendMode = "difference";
    this.pre.style.overflow = "visible";
    this.pre.style.whiteSpace = "pre";
  }

  render(scene, camera) {
    this.renderer.render(scene, camera);

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.context.clearRect(0, 0, w, h);
    if (this.context && w && h) {
      this.context.drawImage(this.renderer.domElement, 0, 0, w, h);
    }

    this.hue();
  }

  onMouseMove(e) {
    this.mouse = { x: e.clientX * PX_RATIO, y: e.clientY * PX_RATIO };
  }

  get dx() {
    return this.mouse.x - this.center.x;
  }

  get dy() {
    return this.mouse.y - this.center.y;
  }

  hue() {
    const deg = (Math.atan2(this.dy, this.dx) * 180) / Math.PI;
    this.deg += (deg - this.deg) * 0.075;
    this.domElement.style.filter = `hue-rotate(${this.deg.toFixed(1)}deg)`;
  }

  dispose() {
    document.removeEventListener("mousemove", this.onMouseMove);
  }
}

class CanvasTxt {
  constructor(
    txt,
    { fontSize = 200, fontFamily = "Arial", color = "#fdf9f3" } = {},
  ) {
    this.canvas = document.createElement("canvas");
    this.context = this.canvas.getContext("2d");
    this.txt = txt;
    this.fontSize = fontSize;
    this.fontFamily = fontFamily;
    this.color = color;

    this.font = `600 ${this.fontSize}px ${this.fontFamily}`;
  }

  resize() {
    this.context.font = this.font;
    const metrics = this.context.measureText(this.txt);

    const textWidth = Math.ceil(metrics.width) + 20;
    const textHeight =
      Math.ceil(
        metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      ) + 20;

    this.canvas.width = textWidth;
    this.canvas.height = textHeight;
  }

  render() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.context.fillStyle = this.color;
    this.context.font = this.font;

    const metrics = this.context.measureText(this.txt);
    const yPos = 10 + metrics.actualBoundingBoxAscent;

    this.context.fillText(this.txt, 10, yPos);
  }

  get width() {
    return this.canvas.width;
  }

  get height() {
    return this.canvas.height;
  }

  get texture() {
    return this.canvas;
  }
}

class CanvAscii {
  constructor(
    {
      text,
      asciiFontSize,
      textFontSize,
      textColor,
      planeBaseHeight,
      enableWaves,
      followMouse,
      rotationLimit,
    },
    containerElem,
    width,
    height,
  ) {
    this.textString = text;
    this.asciiFontSize = asciiFontSize;
    this.textFontSize = textFontSize;
    this.textColor = textColor;
    this.planeBaseHeight = planeBaseHeight;
    this.container = containerElem;
    this.width = width;
    this.height = height;
    this.enableWaves = enableWaves;
    this.followMouse = followMouse;
    this.rotationLimit = rotationLimit;

    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    this.camera = new THREE.PerspectiveCamera(
      60,
      this.width / this.height,
      0.1,
      1000,
    );
    this.camera.position.z = 35;

    this.scene = new THREE.Scene();

    this.onMouseMove = this.onMouseMove.bind(this);

    this.setMesh();
    this.setRenderer();
  }

  setMesh() {
    this.textCanvas = new CanvasTxt(this.textString, {
      fontSize: this.textFontSize,
      fontFamily: "IBM Plex Mono",
      color: this.textColor,
    });
    this.textCanvas.resize();
    this.textCanvas.render();

    this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
    this.texture.minFilter = THREE.NearestFilter;

    const textAspect = this.textCanvas.width / this.textCanvas.height;
    const baseH = this.planeBaseHeight;
    const planeW = baseH * textAspect;
    const planeH = baseH;

    // Increase geometry segments for better wave deformation
    this.geometry = new THREE.PlaneGeometry(planeW, planeH, 64, 64);
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        mouse: { value: 1.0 },
        uTexture: { value: this.texture },
        uEnableWaves: { value: this.enableWaves ? 1.0 : 0.0 },
        uResolution: { value: new THREE.Vector2(this.width, this.height) },
      },
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  setRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setViewport(0, 0, this.width, this.height);

    this.filter = new AsciiFilter(this.renderer, {
      fontFamily: "IBM Plex Mono",
      fontSize: this.asciiFontSize,
      invert: true,
    });

    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);

    if (this.followMouse) {
      window.addEventListener("mousemove", this.onMouseMove);
      window.addEventListener("touchmove", this.onMouseMove);
    }
  }

  setSize(w, h) {
    this.width = w;
    this.height = h;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Adjust camera position to prevent clipping
    this.camera.position.z = 35;
    this.camera.near = 0.1;
    this.camera.far = 1000;
    this.camera.updateProjectionMatrix();

    this.filter.setSize(w, h);
    this.renderer.setSize(w, h);
    this.renderer.setViewport(0, 0, w, h);

    this.center = { x: w / 2, y: h / 2 };
  }

  load() {
    this.animate();
  }

  onMouseMove(evt) {
    const e = evt.touches ? evt.touches[0] : evt;
    this.mouse = { x: e.clientX, y: e.clientY };
  }

  animate() {
    const animateFrame = () => {
      this.animationFrameId = requestAnimationFrame(animateFrame);
      this.render();
    };
    animateFrame();
  }

  render() {
    const time = new Date().getTime() * 0.001;

    this.textCanvas.render();
    this.texture.needsUpdate = true;

    this.mesh.material.uniforms.uTime.value = Math.sin(time);
    this.mesh.material.uniforms.uResolution.value.set(this.width, this.height);

    this.updateRotation();

    // Clear and render with proper viewport
    this.renderer.setViewport(0, 0, this.width, this.height);
    this.renderer.clear();
    this.filter.render(this.scene, this.camera);
  }

  updateRotation() {
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const tiltRange = this.rotationLimit;
    let targetX, targetY;

    if (this.followMouse) {
      targetX = Math.map(this.mouse.y, 0, winH, tiltRange, -tiltRange);
      targetY = Math.map(this.mouse.x, 0, winW, -tiltRange, tiltRange);
    } else {
      const time = performance.now() * 0.0001;
      targetX = Math.cos(time * 0.7 + Math.PI / 2.0) * tiltRange;
      targetY = Math.cos(time * 0.5 + Math.PI / 2.0) * tiltRange;
    }

    // Smoothly interpolate to the target rotation
    this.mesh.rotation.x += (targetX - this.mesh.rotation.x) * 0.05;
    this.mesh.rotation.y += (targetY - this.mesh.rotation.y) * 0.05;
  }

  clear() {
    this.scene.traverse((obj) => {
      if (
        obj.isMesh &&
        typeof obj.material === "object" &&
        obj.material !== null
      ) {
        Object.keys(obj.material).forEach((key) => {
          const matProp = obj.material[key];
          if (
            matProp !== null &&
            typeof matProp === "object" &&
            typeof matProp.dispose === "function"
          ) {
            matProp.dispose();
          }
        });
        obj.material.dispose();
        obj.geometry.dispose();
      }
    });
    this.scene.clear();
  }

  dispose() {
    cancelAnimationFrame(this.animationFrameId);
    this.filter.dispose();
    this.container.removeChild(this.filter.domElement);

    if (this.followMouse) {
      window.removeEventListener("mousemove", this.onMouseMove);
      window.removeEventListener("touchmove", this.onMouseMove);
    }

    this.clear();
    this.renderer.dispose();
  }
}

export default function ASCIIText({
  text = "David!",
  asciiFontSize = 8,
  textFontSize = 200,
  textColor = "#fdf9f3",
  planeBaseHeight = 8,
  enableWaves = true,
  className = "",
  style = {},
  followMouse = true,
  rotationLimit = 0.2,
}) {
  const containerRef = useRef(null);
  const asciiInstance = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const rafId = requestAnimationFrame(() => {
      const { width, height } = container.getBoundingClientRect();
      if (width > 0 && height > 0) {
        asciiInstance.current = new CanvAscii(
          { text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves, followMouse, rotationLimit },
          container,
          width,
          height
        );
        asciiInstance.current.load();
      }
    });

    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (asciiInstance.current && width > 0 && height > 0) {
        asciiInstance.current.setSize(width, height);
      }
    });
    ro.observe(container);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      asciiInstance.current?.dispose();
    };
  }, [text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves, followMouse, rotationLimit]);

  return (
    <div
      ref={containerRef}
      className={`ascii-text-container relative w-full h-full ${className}`}
      style={{ overflow: 'visible', ...style }}
    >
      <style>{`
        .ascii-text-container canvas {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          mix-blend-mode: difference;
          z-index: 9;
        }
        .ascii-text-container pre {
          overflow: visible !important;
          white-space: pre !important;
        }
      `}</style>
    </div>
  );
}
