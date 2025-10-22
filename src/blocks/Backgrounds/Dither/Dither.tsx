/* eslint-disable react/no-unknown-property */
import { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, wrapEffect } from "@react-three/postprocessing";
import { Effect } from "postprocessing";
import * as THREE from "three";
import { Mesh } from 'three'; // Removed MathUtils as it wasn't used

import "./Dither.css";
const MAX_BLOBS = 20;


const waveVertexShader = `
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  gl_Position = projectionMatrix * viewPosition;
}
`;
const waveFragmentShader = `
precision highp float;

// — standard uniforms —
uniform int   uBlobsActive; // Now indicates if blobs *should* be active (growing or fully grown)
uniform bool  uIsFadingOut; // New uniform to indicate fade-out state
uniform vec2  resolution;
uniform float time;
uniform float waveSpeed;
uniform float waveFrequency;
uniform float waveAmplitude;
uniform vec3  waveColor;
uniform int uOctaves;
uniform vec2  mousePos;
uniform int   enableMouseInteraction;
uniform float mouseRadius;

// — blob mask uniforms —
uniform int   numBlobs;
uniform vec4  blobs[${MAX_BLOBS}]; // Use constant
uniform float uGrowDuration;
uniform float uStartTime;
uniform float uFadeDuration; // New uniform
uniform float uFadeStartTime; // New uniform

vec4 mod289(vec4 x){ return x - floor(x*(1.0/289.0))*289.0; }
vec4 permute(vec4 x){ return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314*r; }
vec2 fade(vec2 t){ return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec2 P){
  vec4 Pi = floor(P.xyxy)+vec4(0,0,1,1);
  vec4 Pf = fract(P.xyxy)-vec4(0,0,1,1);
  Pi = mod289(Pi);
  vec4 ix = Pi.xzxz, iy = Pi.yyww;
  vec4 fx = Pf.xzxz, fy = Pf.yyww;
  vec4 i  = permute(permute(ix)+iy);
  vec4 gx = fract(i*(1.0/41.0))*2.0-1.0;
  vec4 gy = abs(gx)-0.5;
  vec4 tx = floor(gx+0.5);
  gx -= tx;
  vec2 g00 = vec2(gx.x,gy.x);
  vec2 g10 = vec2(gx.y,gy.y);
  vec2 g01 = vec2(gx.z,gy.z);
  vec2 g11 = vec2(gx.w,gy.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g00,g00),dot(g01,g01),dot(g10,g10),dot(g11,g11)));
  g00 *= norm.x; g01 *= norm.y; g10 *= norm.z; g11 *= norm.w;
  float n00 = dot(g00, vec2(fx.x,fy.x));
  float n10 = dot(g10, vec2(fx.y,fy.y));
  float n01 = dot(g01, vec2(fx.z,fy.z));
  float n11 = dot(g11, vec2(fx.w,fy.w));
  vec2 fxy = fade(Pf.xy);
  vec2 nx  = mix(vec2(n00,n01), vec2(n10,n11), fxy.x);
  return 2.3 * mix(nx.x, nx.y, fxy.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 1.0;
  for(int i = 0; i < 8; i++){
    if(i >= uOctaves) break;
    v += a * abs(cnoise(p));
    p *= waveFrequency;
    a *= waveAmplitude;
  }
  return v;
}

float pattern(vec2 p){
  vec2 p2 = p - time * waveSpeed;
  return fbm(p - fbm(p + fbm(p2)));
}

void main(){
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  uv -= 0.5;

  uv.y *= resolution.y / resolution.x; // Aspect ratio correction

  float mask = 0.0;
  // Blobs are only processed if they are active OR fading out
  if(uBlobsActive == 1 || uIsFadingOut){
    float edge = 0.05;
    float effectProgress = 0.0;
    float currentEffectTime = 0.0;
    float sizeFactor = 0.0; // Factor to multiply radius by (0 to 1)

    if (uIsFadingOut) {
        currentEffectTime = time - uFadeStartTime;
        effectProgress = clamp(currentEffectTime / uFadeDuration, 0.0, 1.0);
        sizeFactor = 1.0 - effectProgress; // Shrink from 1 to 0
    } else { // Growing in or fully grown
        currentEffectTime = time - uStartTime;
        effectProgress = clamp(currentEffectTime / uGrowDuration, 0.0, 1.0);
        sizeFactor = effectProgress; // Grow from 0 to 1
    }

    // Only render if sizeFactor is > 0 (visible)
    if (sizeFactor > 0.0) {
        for(int i = 0; i < numBlobs; ++i) {
            // Check bounds for safety, although numBlobs should be correct
             if (i >= ${MAX_BLOBS}) break;

            vec4 B = blobs[i];
            // Apply sizeFactor to radii
            float rx = max(B.z * sizeFactor, 1e-4);
            float ry = max(B.w * sizeFactor, 1e-4);

            vec2 dpos = uv - B.xy;
            float d = length(vec2(dpos.x / rx, dpos.y / ry));

            // quick reject
            if (d > 1.0 + waveAmplitude + edge) continue;

            // noise calculation
            float rnd = fract(sin(float(i)*12.9898)*43758.5453);
            float w = pattern(dpos * waveFrequency + (time + rnd*10.0)*waveSpeed) * waveAmplitude;

            float thresh = 1.0 + w;
            float m = 1.0 - smoothstep(thresh - edge, thresh + edge, d);
            mask = max(mask, m);
        }
    }
  }


  float f = pattern(uv);
  if(enableMouseInteraction==1){
    vec2 m = (mousePos/resolution - 0.5)*vec2(1.0,-1.0);
    m.y *= resolution.y / resolution.x; // Aspect ratio correction for mouse
    float dist = length(uv-m);
    f -= 0.5*(1.0 - smoothstep(0.0, mouseRadius, dist));
  }

  vec3 col = mix(vec3(0.0), waveColor, f);
  // Apply mask regardless of whether it was calculated this frame
  col = mix(col, vec3(0.0), mask);

  gl_FragColor = vec4(col,1.0);
}
`;

const ditherFragmentShader = `
precision highp float;
uniform float colorNum;
uniform float pixelSize;
uniform vec2 resolution; // Need resolution here too

const float bayerMatrix8x8[64] = float[64](
  0.0/64.0, 48.0/64.0, 12.0/64.0, 60.0/64.0,  3.0/64.0, 51.0/64.0, 15.0/64.0, 63.0/64.0,
  32.0/64.0,16.0/64.0, 44.0/64.0, 28.0/64.0, 35.0/64.0,19.0/64.0, 47.0/64.0, 31.0/64.0,
  8.0/64.0, 56.0/64.0,  4.0/64.0, 52.0/64.0, 11.0/64.0,59.0/64.0,  7.0/64.0, 55.0/64.0,
  40.0/64.0,24.0/64.0, 36.0/64.0, 20.0/64.0, 43.0/64.0,27.0/64.0, 39.0/64.0, 23.0/64.0,
  2.0/64.0, 50.0/64.0, 14.0/64.0, 62.0/64.0,  1.0/64.0,49.0/64.0, 13.0/64.0, 61.0/64.0,
  34.0/64.0,18.0/64.0, 46.0/64.0, 30.0/64.0, 33.0/64.0,17.0/64.0, 45.0/64.0, 29.0/64.0,
  10.0/64.0,58.0/64.0,  6.0/64.0, 54.0/64.0,  9.0/64.0,57.0/64.0,  5.0/64.0, 53.0/64.0,
  42.0/64.0,26.0/64.0, 38.0/64.0, 22.0/64.0, 41.0/64.0,25.0/64.0, 37.0/64.0, 21.0/64.0
);

vec3 dither(vec2 uv, vec3 color) {
  // Use gl_FragCoord directly for screen-space dithering
  vec2 screenCoord = gl_FragCoord.xy;
  int x = int(mod(screenCoord.x / pixelSize, 8.0));
  int y = int(mod(screenCoord.y / pixelSize, 8.0));

  float threshold = bayerMatrix8x8[y * 8 + x] - 0.5; // Adjusted threshold center
  float step = 1.0 / (colorNum); // Adjusted step for quantization levels

  color += threshold * step;
  color = clamp(color, 0.0, 1.0); // Clamp before quantization

  // Quantize to colorNum levels
  return floor(color * colorNum + 0.5) / colorNum;
}


void mainImage(in vec4 inputColor, in vec2 uv, out vec4 outputColor) {
    // Read the color from the input buffer (previous pass)
    vec4 color = texture2D(inputBuffer, uv);

    // Apply dithering
    color.rgb = dither(uv, color.rgb);

    outputColor = color;
}
`;

class RetroEffectImpl extends Effect {
  public uniforms: Map<string, THREE.Uniform<any>>;
  constructor() {
    const uniforms = new Map<string, THREE.Uniform<any>>([
      ["colorNum", new THREE.Uniform(4.0)],
      ["pixelSize", new THREE.Uniform(2.0)],
      ["resolution", new THREE.Uniform(new THREE.Vector2(1, 1))], // Add resolution uniform
    ]);
    super("RetroEffect", ditherFragmentShader, { uniforms });
    this.uniforms = uniforms;
  }
  set colorNum(value: number) {
    this.uniforms.get("colorNum")!.value = value;
  }
  get colorNum(): number {
    return this.uniforms.get("colorNum")!.value;
  }
  set pixelSize(value: number) {
    this.uniforms.get("pixelSize")!.value = value;
  }
  get pixelSize(): number {
    return this.uniforms.get("pixelSize")!.value;
  }
  // Add setter/getter for resolution
  set resolution(value: THREE.Vector2) {
    this.uniforms.get("resolution")!.value = value;
  }
  get resolution(): THREE.Vector2 {
    return this.uniforms.get("resolution")!.value;
  }
}

import { forwardRef } from "react";

const RetroEffect = forwardRef<
  RetroEffectImpl,
  { colorNum: number; pixelSize: number }
>((props, ref) => {
  const { size } = useThree(); // Get viewport size
  const { colorNum, pixelSize } = props;
  const effect = useRef<RetroEffectImpl>();

  // Update resolution uniform when size changes
  useEffect(() => {
    if (effect.current) {
        // No need to multiply by DPR here as gl_FragCoord is already in pixel coordinates
      effect.current.resolution.set(size.width, size.height);
    }
  }, [size]);

  const WrappedRetroEffect = wrapEffect(RetroEffectImpl);
  return (
    <WrappedRetroEffect
      ref={(instance) => {
        effect.current = instance as RetroEffectImpl | undefined; // Store ref
        if (typeof ref === 'function') {
          ref(instance);
        } else if (ref) {
          ref.current = instance;
        }
      }}
      colorNum={colorNum}
      pixelSize={pixelSize}
    />
  );
});

RetroEffect.displayName = "RetroEffect";


function DitheredWaves({
  waveSpeed,
  waveFrequency,
  waveAmplitude,
  waveColor,
  colorNum,
  pixelSize,
  disableAnimation,
  enableMouseInteraction,
  mouseRadius,
  blobsActive = false, // Prop indicating if blobs *should* be active
  blobs,
  growDuration = 1.0,  // Make durations props
  fadeDuration = 1.0   // Make durations props
}) {
  const mesh = useRef<Mesh | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const { viewport, size, gl } = useThree();
  const startTimeRef = useRef(0);
  const fadeStartTimeRef = useRef(0); // Ref for fade start time
  const wasActiveRef = useRef(blobsActive); // Track previous active state
  const isFadingOutRef = useRef(false); // Track if currently fading out

  useEffect(() => {
    if (mesh.current) {
      mesh.current.scale.set(viewport.width, viewport.height, 1);
    }
  }, [viewport.width, viewport.height]);


  // Initialize uniforms including new ones
  const waveUniformsRef = useRef({
    time: new THREE.Uniform(0),
    resolution: new THREE.Uniform(new THREE.Vector2(0, 0)),
    waveSpeed: new THREE.Uniform(waveSpeed),
    waveFrequency: new THREE.Uniform(waveFrequency),
    waveAmplitude: new THREE.Uniform(waveAmplitude),
    waveColor: new THREE.Uniform(new THREE.Color(...waveColor)),
    mousePos: new THREE.Uniform(new THREE.Vector2(0, 0)),
    uBlobsActive: new THREE.Uniform(blobsActive ? 1 : 0), // Use initial prop value
    uIsFadingOut: new THREE.Uniform(false), // Initialize fading state
    uOctaves: new THREE.Uniform(8),
    enableMouseInteraction: new THREE.Uniform(enableMouseInteraction ? 1 : 0),
    mouseRadius: new THREE.Uniform(mouseRadius),
    uGrowDuration: new THREE.Uniform(growDuration),
    uStartTime: new THREE.Uniform(0),
    uFadeDuration: new THREE.Uniform(fadeDuration), // Add fade duration uniform
    uFadeStartTime: new THREE.Uniform(0), // Add fade start time uniform
    blobs: {
      value: Array.from({ length: MAX_BLOBS }, () => new THREE.Vector4(0, 0, 0, 0))
    },
    numBlobs: { value: 0 },
  });

  // Update blob data when blobs prop changes
  useEffect(() => {
    if (!waveUniformsRef.current) return;
    const numBlobsToUse = Math.min(blobs.length, MAX_BLOBS);
    waveUniformsRef.current.numBlobs.value = numBlobsToUse;
    const uniformBlobArray = waveUniformsRef.current.blobs.value;

    for (let i = 0; i < MAX_BLOBS; i++) {
      if (i < numBlobsToUse) {
        uniformBlobArray[i].set(
          blobs[i].cx,
          blobs[i].cy,
          blobs[i].rx,
          blobs[i].ry
        );
      } else {
        // Zero out unused blob slots
        uniformBlobArray[i].set(0, 0, 0, 0);
      }
    }
  }, [blobs]);


  // Update resolution when size or pixel ratio changes
  useEffect(() => {
    const dpr = gl.getPixelRatio();
    const newWidth = Math.floor(size.width * dpr);
    const newHeight = Math.floor(size.height * dpr);
    const currentRes = waveUniformsRef.current.resolution.value;

    if (currentRes.x !== newWidth || currentRes.y !== newHeight) {
      currentRes.set(newWidth, newHeight);
    }
  }, [size, gl]);

  // Frame loop for updating time and animation state
  useFrame(({ clock }) => {
    const uniforms = waveUniformsRef.current;
    const elapsedTime = clock.getElapsedTime();

    if (!disableAnimation) {
      uniforms.time.value = elapsedTime;
    }

    // --- State Management for Grow/Fade ---
    const shouldBeActive = blobsActive;
    const wasActive = wasActiveRef.current;

    // Start Grow: Was inactive, now should be active
    if (!wasActive && shouldBeActive && startTimeRef.current === 0) {
        startTimeRef.current = elapsedTime;
        fadeStartTimeRef.current = 0; // Reset fade timer
        isFadingOutRef.current = false;
        uniforms.uStartTime.value = startTimeRef.current;
        uniforms.uFadeStartTime.value = 0;
        uniforms.uIsFadingOut.value = false;
        uniforms.uBlobsActive.value = 1; // Mark as active (growing or grown)
    }
    // Start Fade: Was active, now should be inactive
    else if (wasActive && !shouldBeActive && fadeStartTimeRef.current === 0) {
        fadeStartTimeRef.current = elapsedTime;
        startTimeRef.current = 0; // Reset grow timer
        isFadingOutRef.current = true;
        uniforms.uFadeStartTime.value = fadeStartTimeRef.current;
        uniforms.uStartTime.value = 0;
        uniforms.uIsFadingOut.value = true;
        uniforms.uBlobsActive.value = 0; // Mark as inactive (fading or gone)
    }

    // Check if fade is complete
    if (isFadingOutRef.current) {
        const fadeProgress = (elapsedTime - fadeStartTimeRef.current) / uniforms.uFadeDuration.value;
        if (fadeProgress >= 1.0) {
            isFadingOutRef.current = false; // Stop fading state
            fadeStartTimeRef.current = 0;   // Reset timer
            uniforms.uIsFadingOut.value = false; // Update shader
        }
    }
     // Check if grow is complete (optional, could be useful)
    if (!isFadingOutRef.current && startTimeRef.current !== 0) {
        const growProgress = (elapsedTime - startTimeRef.current) / uniforms.uGrowDuration.value;
        // if (growProgress >= 1.0) { // Blob is fully grown }
    }


    // Update previous state for next frame
    wasActiveRef.current = shouldBeActive;
    // ------------------------------------

    // Update standard uniforms continuously
    uniforms.waveSpeed.value = waveSpeed;
    uniforms.waveFrequency.value = waveFrequency;
    uniforms.waveAmplitude.value = waveAmplitude;
    uniforms.waveColor.value.set(...waveColor);
    uniforms.enableMouseInteraction.value = enableMouseInteraction ? 1 : 0;
    uniforms.mouseRadius.value = mouseRadius;
    uniforms.uGrowDuration.value = growDuration; // Update in case prop changes
    uniforms.uFadeDuration.value = fadeDuration; // Update in case prop changes


    if (enableMouseInteraction) {
      uniforms.mousePos.value.set(mousePos.x, mousePos.y);
    }
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!enableMouseInteraction) return;
    const rect = gl.domElement.getBoundingClientRect();
    const dpr = gl.getPixelRatio();
    // Calculate coordinates relative to canvas, adjusted for DPR
    const x = (e.clientX - rect.left) * dpr;
    const y = (e.clientY - rect.top) * dpr;
    setMousePos({ x, y });
  };

  return (
    <>
      <mesh ref={mesh} scale={[viewport.width, viewport.height, 1]}>
        <planeGeometry args={[1, 1]} />
        <shaderMaterial
          vertexShader={waveVertexShader}
          fragmentShader={waveFragmentShader}
          uniforms={waveUniformsRef.current}
        />
      </mesh>
      <EffectComposer>
        <RetroEffect colorNum={colorNum} pixelSize={pixelSize} />
      </EffectComposer>
      {/* Interaction plane */}
      <mesh
        onPointerMove={handlePointerMove}
        position={[0, 0, 0.01]} // Slightly in front
        scale={[viewport.width, viewport.height, 1]}
        visible={false} // Make it invisible
      >
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} />
      </mesh>
    </>
  );
}

interface BlobConfig {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  label: string; // Keep label if needed elsewhere, shader doesn't use it
}

interface DitherProps {
  waveSpeed?: number;
  waveFrequency?: number;
  waveAmplitude?: number;
  waveColor?: [number, number, number];
  colorNum?: number;
  pixelSize?: number;
  disableAnimation?: boolean;
  enableMouseInteraction?: boolean;
  mouseRadius?: number;
  blobsActive?: boolean;
  blobs?: BlobConfig[];
  growDuration?: number; // Add prop
  fadeDuration?: number; // Add prop
}

export default function Dither({
  waveSpeed = 0.05,
  waveFrequency = 3,
  waveAmplitude = 0.3,
  waveColor = [0.5, 0.5, 0.5],
  colorNum = 4,
  pixelSize = 2,
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 0.15, // Adjusted default mouse radius
  blobsActive = false,
  blobs = [],
  growDuration = 1.0, // Default grow duration
  fadeDuration = 0.5  // Default fade duration (faster fade)
}: DitherProps) {
  return (
    <Canvas
      className="dither-container absolute inset-0 w-full h-full"
      camera={{ position: [0, 0, 6], fov: 50 }} // Adjusted camera FOV slightly
      // Consider setting flat: true if color space conversion isn't needed
      // gl={{ antialias: false, preserveDrawingBuffer: false, flat: true }}
      gl={{ antialias: true }} // Keep AA for smoother waves, remove preserveDrawingBuffer unless needed
      dpr={Math.max(window.devicePixelRatio, 1)} // Clamp DPR for performance
      // frameloop="demand" // Only render when needed - might break continuous animations
    >
      <DitheredWaves
        waveSpeed={waveSpeed}
        waveFrequency={waveFrequency}
        waveAmplitude={waveAmplitude}
        waveColor={waveColor}
        colorNum={colorNum}
        pixelSize={pixelSize}
        disableAnimation={disableAnimation}
        enableMouseInteraction={enableMouseInteraction}
        mouseRadius={mouseRadius}
        blobsActive={blobsActive}
        blobs={blobs}
        growDuration={growDuration}
        fadeDuration={fadeDuration}
      />
    </Canvas>
  );
}