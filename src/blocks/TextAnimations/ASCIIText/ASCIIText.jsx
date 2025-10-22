import React, { useEffect } from "react";
import { useRef } from "react";
import * as THREE from "three";
const DEFAULT_FONT_STACK =
  `"Times New Roman", Times, "Liberation Serif", "Nimbus Roman No9 L", serif`;

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
uniform float uStyleMode; // 0.0 = subtle, 1.0 = creative blob style

void main() {
    float time = uTime;
    vec2 pos = vUv;
    
    float move = sin(time + mouse) * 0.01;
    vec4 baseSample = texture2D(uTexture, pos);
    float intensity = baseSample.r;

    // Enhanced chromatic aberration with varying offsets - STRONGER
    float aberrationStrength = mix(0.01, 0.045, uStyleMode);
    float r = texture2D(uTexture, pos + cos(time * 2. - time + pos.x) * aberrationStrength).r;
    float g = texture2D(uTexture, pos + tan(time * .5 + pos.x - time) * aberrationStrength).g;
    float b = texture2D(uTexture, pos - cos(time * 2. + time + pos.y) * aberrationStrength).b;

    vec3 baseWhite = vec3(intensity);
    vec3 chroma = vec3(r, g, b);

    if (uStyleMode > 0.5) {
        // Creative big blob style: STRONGER color blending with HIGH CONTRAST
        vec2 centered = pos - 0.5;
        float dist = length(centered);
        float angle = atan(centered.y, centered.x);
        
        // Enhanced contrast on intensity
        float enhancedIntensity = pow(intensity, 0.75); // boost mid-tones
        float contrastBoost = smoothstep(0.2, 0.8, enhancedIntensity);
        
        // Animated radial gradient - stronger
        float radialGrad = smoothstep(0.7, 0.0, dist);
        float spiralPattern = sin(angle * 4.0 + time * 0.5 + dist * 12.0) * 0.5 + 0.5;
        
        // Multi-color gradient blend - MORE VIVID
        vec3 color1 = vec3(0.75, 0.85, 1.0);      // cooler blue-white
        vec3 color2 = vec3(1.0, 0.7, 0.9);        // stronger pink
        vec3 color3 = vec3(0.65, 1.0, 0.95);      // vivid cyan
        
        float colorPhase = fract(time * 0.25 + pos.x * 0.8);
        vec3 gradientColor = mix(color1, color2, colorPhase);
        gradientColor = mix(gradientColor, color3, spiralPattern * 0.6);
        
        // STRONGER edge glow with chromatic separation
        float edgeGlow = smoothstep(0.75, 0.15, enhancedIntensity) * (1.0 - enhancedIntensity);
        vec3 glowChroma = vec3(r * 1.5, g * 1.4, b * 1.6);
        
        // Combine with STRONGER blending
        vec3 styledColor = mix(baseWhite, gradientColor, 0.35 + radialGrad * 0.45);
        styledColor = mix(styledColor, chroma, 0.5 + enhancedIntensity * 0.25);
        styledColor = mix(styledColor, glowChroma, edgeGlow * 0.75);
        
        // HIGH CONTRAST saturation mapping
        float saturation = mix(0.5, 1.0, 1.0 - contrastBoost);
        vec3 finalColor = mix(styledColor, baseWhite * 1.1, 1.0 - saturation);
        
        // Add brightness boost with contrast
        float brightnessMod = 0.85 + contrastBoost * 0.35;
        
        gl_FragColor = vec4(finalColor * brightnessMod, baseSample.a);
    } else {
        // Subtle style (original header look)
        float colorMix = mix(0.12, 0.32, clamp(1.0 - intensity, 0.0, 1.0));
        vec3 hinted = mix(baseWhite, chroma, colorMix);

        float halo = smoothstep(0.65, 0.15, intensity);
        vec3 haloColor = mix(hinted, vec3(0.88, 1.0, 0.95), halo * 0.6);

        gl_FragColor = vec4(haloColor, baseSample.a);
    }
}
`;Math.map = function (n, start, stop, start2, stop2) {
  return ((n - start) / (stop - start)) * (stop2 - start2) + start2;
};

// Roughly average character width = 0.6em for uppercase; tune as needed
const CHAR_WIDTH_EM = 0.6;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Compute a font size that keeps the label on one line inside the blob.
 * - Fits ~90% of available width (some breathing room)
 * - Clamps so short labels don't look huge and tiny blobs don't make text unreadable
 */
function adaptiveLabelFontSize(label, boxWidthPx, {
  fitRatio = 0.9,      // how much of the width we allow the text to occupy
  minPx = 14,          // minimum readable size
  maxPx = 50           // hard cap to keep things tasteful
} = {}) {
  const len = Math.max(label.trim().length, 1);
  // Solve: fontSize * len * CHAR_WIDTH_EM <= fitRatio * boxWidth
  const sizeByFit = (fitRatio * boxWidthPx) / (len * CHAR_WIDTH_EM);

  // Also cap by a width-based baseline so very wide blobs still limit font
  const widthBaseline = boxWidthPx / 8.5; // tune this divisor to taste

  return clamp(Math.min(sizeByFit, widthBaseline), minPx, maxPx);
}

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
    { fontSize = 200, fontFamily = DEFAULT_FONT_STACK, color = "#fdf9f3" } = {},
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
      fontFamily,
      overlayFontFamily,
      fitToView,
      fitPadding,
      fitMode,
      keepHeight,
      squishLimit,
      stretchX,
      stretchLimit,
      minPlaneWidth,
      forceAspectRatio,
      styleMode,
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
    this.fontFamily = fontFamily;
    this.overlayFontFamily = overlayFontFamily;
    this.fitToView = fitToView;
    this.fitPadding = fitPadding ?? 0.8;
    this.fitMode = fitMode || 'contain'; // 'contain' | 'cover' | 'width' | 'height'
    this.keepHeight = !!keepHeight;
    this.squishLimit = typeof squishLimit === 'number' ? squishLimit : 0.9; // min allowed X relative to Y
    this.stretchX = !!stretchX;
    this.stretchLimit = typeof stretchLimit === 'number' ? stretchLimit : 1.6; // max X relative to Y
    this.minPlaneWidth = minPlaneWidth;
    this.forceAspectRatio = forceAspectRatio; // force plane to specific width:height ratio
    this.styleMode = styleMode ?? 'subtle'; // 'subtle' or 'creative'

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

  fitMeshToView() {
    if (!this.mesh) return;

    const visibleH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const visibleW = visibleH * (this.width / this.height);

    const planeH = this.planeBaseHeight;
    const planeW = this.planeBaseHeight * (this.textCanvas.width / this.textCanvas.height);

    const sH = (visibleH * this.fitPadding) / planeH;
    const sW = (visibleW * this.fitPadding) / planeW;

    let scale;
    if (!this.fitToView) {
      scale = 1;
    } else {
      switch (this.fitMode) {
        case 'cover':
          scale = Math.max(sH, sW);
          break;
        case 'width':
          scale = sW;
          break;
        case 'height':
          scale = sH;
          break;
        case 'contain':
        default:
          scale = Math.min(sH, sW);
      }
    }

    if (this.keepHeight && this.fitMode === 'height') {
      const targetY = sH;
      let scaleX = sH;
      let scaleY = sH;
      if (sW < sH) {
        const minAllowedX = this.squishLimit * sH;
        if (sW >= minAllowedX) {
          // allow mild squeeze within limit
          scaleX = sW;
          scaleY = targetY;
        } else {
          // width too small; preserve aspect by uniformly downscaling
          scaleX = sW;
          scaleY = sW;
        }
      } else if (sW > sH && this.stretchX) {
        // allow horizontal stretch (up to a limit) so short titles can fill width
        const maxAllowedX = this.stretchLimit * sH;
        scaleX = Math.min(sW, maxAllowedX);
        scaleY = targetY;
      }
      this.mesh.scale.set(scaleX, scaleY, 1);
    } else {
      this.mesh.scale.set(scale, scale, 1);
    }
  }


  setMesh() {
    this.textCanvas = new CanvasTxt(this.textString, {
      fontSize: this.textFontSize,
      fontFamily: this.fontFamily || DEFAULT_FONT_STACK,
      color: this.textColor,
    });
    this.textCanvas.resize();
    this.textCanvas.render();

    this.texture = new THREE.CanvasTexture(this.textCanvas.texture);
    this.texture.minFilter = THREE.NearestFilter;

    const textAspect = this.textCanvas.width / this.textCanvas.height;
    const baseH = this.planeBaseHeight;
    const naturalPlaneW = baseH * textAspect;
    let planeW = naturalPlaneW;
    
    // If forceAspectRatio is set, use it to determine plane width
    let needsUVAdjustment = false;
    if (this.forceAspectRatio) {
      planeW = baseH * this.forceAspectRatio;
      needsUVAdjustment = true;
    } else if (this.minPlaneWidth && planeW < this.minPlaneWidth) {
      // Fallback to minPlaneWidth if no forceAspectRatio
      planeW = this.minPlaneWidth;
      needsUVAdjustment = true;
    }
    
    const planeH = baseH;

    // Increase geometry segments for better wave deformation
    this.geometry = new THREE.PlaneGeometry(planeW, planeH, 64, 64);
    
    // Adjust UVs to center the texture on the plane if needed
    if (needsUVAdjustment) {
      const uvScaleX = naturalPlaneW / planeW;
      const uvOffsetX = (1 - uvScaleX) / 2;
      
      const uvAttribute = this.geometry.attributes.uv;
      for (let i = 0; i < uvAttribute.count; i++) {
        const u = uvAttribute.getX(i);
        uvAttribute.setX(i, u * uvScaleX + uvOffsetX);
      }
    }
    
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
        uStyleMode: { value: this.styleMode === 'creative' ? 1.0 : 0.0 },
      },
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
    this.fitMeshToView();
  }

  setRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    this.renderer.setPixelRatio(PX_RATIO);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setViewport(0, 0, this.width, this.height);

    this.filter = new AsciiFilter(this.renderer, {
      fontFamily: this.overlayFontFamily || this.fontFamily || DEFAULT_FONT_STACK,
      fontSize: this.asciiFontSize,
      invert: true,
    });

    this.container.appendChild(this.filter.domElement);
    this.setSize(this.width, this.height);
    this.fitMeshToView();

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
    this.fitMeshToView();
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
  fontFamily = DEFAULT_FONT_STACK,
  overlayFontFamily = DEFAULT_FONT_STACK,
  fitToView = true,
  fitPadding = 0.8,
  fitMode = 'contain',
  keepHeight = false,
  squishLimit = 0.9,
  stretchX = false,
  stretchLimit = 1.6,
  minPlaneWidth,
  forceAspectRatio,
  styleMode = 'subtle', // 'subtle' or 'creative'
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
          {
            text, asciiFontSize, textFontSize, textColor, planeBaseHeight,
            enableWaves, followMouse, rotationLimit, fontFamily,
            overlayFontFamily: overlayFontFamily ?? fontFamily, fitToView, fitPadding, fitMode, keepHeight, squishLimit, stretchX, stretchLimit, minPlaneWidth, forceAspectRatio, styleMode
          },
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
  }, [text, asciiFontSize, textFontSize, textColor, planeBaseHeight, enableWaves, followMouse, rotationLimit, fontFamily, overlayFontFamily, styleMode]);

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
