import { AudioAnalyzer } from './AudioAnalyzer';
import { Conductor } from '../conductor';
import { MusicalState, SignalFeatures, MusicalContext } from '../types';
import { AssetItem } from '../assets/assetTypes';

export interface VisualOptions {
  enableGlitch: boolean;
  enableVHS: boolean;
  enableCurvature: boolean;
  enableNoise: boolean;
  enableFlicker: boolean;
  enableRGBSplit: boolean;
  enableDriftOffset: boolean;
  enableBlobDynamics: boolean;
  globalEffects: number;
  flickerAmount: number;
  motionAmount: number;
  eventDensity: number;
  transitionSpeed: number;
  overlayEnabled: boolean;
  overlayTransparencyMode: 'normal' | 'black' | 'white';
  overlayOpacity: number;
}

const transparentImg = new Image();
transparentImg.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
const dummyAsset: AssetItem = {
  file: new File([], "dummy.png"),
  image: transparentImg,
  metadata: { type: 'overlay', aspect: 'square', color: 'color', behavior: 'rare' }
};

export class VisualEngine {
  canvas: HTMLCanvasElement;
  gl: WebGLRenderingContext;
  assets: AssetItem[];
  audioMode: 'mic' | 'ambient' | 'screen' | 'file';
  deviceId?: string;
  audioFile?: File;
  visualMode: 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope';
  colorMode: string;
  
  options: VisualOptions = {
    enableGlitch: true,
    enableVHS: true,
    enableCurvature: true,
    enableNoise: true,
    enableFlicker: true,
    enableRGBSplit: true,
    enableDriftOffset: false,
    enableBlobDynamics: true,
    globalEffects: 0.9,
    flickerAmount: 0.5,
    motionAmount: 0.6,
    eventDensity: 0.7,
    transitionSpeed: 0.5,
    overlayEnabled: true,
    overlayTransparencyMode: 'normal',
    overlayOpacity: 100
  };
  
  bgAssets: AssetItem[] = [];
  posterAssets: AssetItem[] = [];
  overlayAssets: AssetItem[] = [];
  logoAssets: AssetItem[] = [];
  flashAssets: AssetItem[] = [];
  
  bgIndex: number = 0;
  posterIndex: number = 0;
  overlayIndex: number = 0;
  logoIndex: number = 0;
  flashIndex: number = 0;

  time: number = 0;
  zoomState: 'HOLD' | 'DRIFT' | 'PULSE' = 'DRIFT';
  currentZoom: number = 0;
  targetZoom: number = 0;
  beatCount: number = 0;
  lastKick: number = 0;
  pulseTimer: number = 0;
  prevPosterIndex: number = -1;
  audioAnalyzer: AudioAnalyzer | null = null;
  conductor: Conductor = new Conductor();
  lastMusicalContext: MusicalContext | null = null;
  running: boolean = true;
  lastTime: number;
  program!: WebGLProgram;
  uniforms: any = {};
  onError?: (err: Error) => void;

  lastBgChange: number = 0;
  lastPosterChange: number = 0;
  lastOverlayChange: number = 0;

  lastPeakTime: number = 0;
  nextRandomEventTime: number = 0;
  
  glitchType: number = 0;
  glitchTime: number = 0;
  glitchIntensity: number = 0;
  glitchDuration: number = 0;
  signalGlitchBounce: number = 0;
  signalGlitchRecoil: number = 0;
  postDropEnergy: number = 0;
  
  isBuildup: boolean = false;
  buildupValue: number = 0;
  dropPulse: number = 0;
  layerVisibility: number[] = [1, 1, 1, 1];
  posterZoomLevel: number = 1.0;
  posterCrop: {x: number, y: number} = {x: 0, y: 0};

  // Macro States
  macroBuildUp: boolean = false;
  macroTension: boolean = false;
  macroDrop: boolean = false;
  macroExtraBounce: boolean = false;

  lavaState: number = 0;
  lavaNextState: number = 0;
  lavaMix: number = 0;
  lavaIntensity: number = 1.0;
  lavaReveal: number = 0.0;
  lavaTransformationAmount: number = 0.0;
  lavaTransformationTarget: number = 0.0;
  nextLavaStateTime: number = 0;
  nextLavaTransformationTime: number = 0;

  representPulse: number = 0;
  representWave: number = 0;
  representWaveColor: number = 0; // 0: blue, 1: red
  nextRepresentEventTime: number = 0;

  kaleidoscopeRotation: number = 0;
  kaleidoscopeDrift: {x: number, y: number} = {x: 0, y: 0};
  kaleidoscopeTunnelDepth: number = 0;
  kaleidoscopeCenterPulse: number = 0;
  kaleidoscopeShapeMorph: number = 0;
  kaleidoscopeShapeType: number = 0;
  kaleidoscopeTransitionFade: number = 1.0;
  
  contourStripOffset: number = 0;
  contourPlaneShift: number = 0;
  contourReassembly: number = 1.0;
  contourBounce: number = 0;
  contourShatter: number = 0;
  contourRasterDensity: number = 1.0;
  contourReliefDepth: number = 0.5;

  constructor(
    canvas: HTMLCanvasElement, 
    assets: AssetItem[], 
    audioMode: 'mic' | 'ambient' | 'screen' | 'file', 
    deviceId: string | undefined, 
    audioFile: File | undefined,
    visualMode: 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope',
    colorMode: string,
    onError?: (err: Error) => void
  ) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl')!;
    this.assets = assets;
    this.audioMode = audioMode;
    this.deviceId = deviceId;
    this.audioFile = audioFile;
    this.visualMode = visualMode;
    this.colorMode = colorMode;
    this.onError = onError;
    this.conductor = new Conductor();
    
    this.bgAssets = assets.filter(a => a.metadata.type === 'bg');
    this.posterAssets = assets.filter(a => a.metadata.type === 'poster');
    this.overlayAssets = assets.filter(a => a.metadata.type === 'overlay');
    this.logoAssets = assets.filter(a => a.metadata.type === 'logo');
    this.flashAssets = assets.filter(a => a.metadata.type === 'flash');
    
    if (this.bgAssets.length === 0) this.bgAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.posterAssets.length === 0) this.posterAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.overlayAssets.length === 0) this.overlayAssets = [dummyAsset];
    if (this.logoAssets.length === 0) this.logoAssets = [dummyAsset];
    if (this.flashAssets.length === 0) this.flashAssets = [dummyAsset];
    
    this.bgIndex = Math.floor(Math.random() * this.bgAssets.length);
    this.posterIndex = Math.floor(Math.random() * this.posterAssets.length);
    this.overlayIndex = Math.floor(Math.random() * this.overlayAssets.length);
    this.logoIndex = Math.floor(Math.random() * this.logoAssets.length);
    this.flashIndex = Math.floor(Math.random() * this.flashAssets.length);
    
    if (audioMode !== 'ambient') {
      this.audioAnalyzer = new AudioAnalyzer();
      this.audioAnalyzer.start(audioMode, deviceId, audioFile).catch(err => {
        console.error("Failed to start audio analyzer", err);
        if (this.onError) this.onError(err);
      });
    }

    this.initGL();
    this.updateTextures();
    this.resize();
    window.addEventListener('resize', this.resize);
    
    this.lastTime = performance.now();
    this.render();
  }

  textureCache: Map<HTMLImageElement, WebGLTexture> = new Map();

  getTexture(img: HTMLImageElement): WebGLTexture {
    const gl = this.gl;
    if (this.textureCache.has(img)) {
      return this.textureCache.get(img)!;
    }
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    this.textureCache.set(img, tex);
    return tex;
  }

  updateTextures(type?: 'bg' | 'poster' | 'overlay' | 'logo' | 'flash') {
    // No-op: Textures are now fetched dynamically in render() via getTexture()
  }

  resize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  initGL() {
    const gl = this.gl;
    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        vUv.y = 1.0 - vUv.y;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, `
      precision mediump float;
      varying vec2 vUv;
      uniform sampler2D u_tex_bg;
      uniform sampler2D u_tex_poster;
      uniform sampler2D u_tex_overlay;
      uniform sampler2D u_tex_logo;
      uniform sampler2D u_tex_flash;
      
      uniform float u_time;
      uniform float u_global_effects;
      uniform float u_vol;
      uniform float u_mid;
      uniform float u_high;
      uniform float u_low;
      uniform float u_zoom;
      
      uniform float u_kick;
      uniform float u_clap;
      uniform float u_hat;
      uniform float u_bass;
      
      uniform vec2 u_resolution;
      uniform vec2 u_res_bg;
      uniform vec2 u_res_poster;
      uniform vec2 u_res_overlay;
      uniform vec2 u_res_logo;
      uniform vec2 u_res_flash;
      
      uniform int u_visual_mode;
      uniform int u_color_mode;

      uniform int u_glitch_type;
      uniform float u_glitch_time;
      uniform float u_glitch_intensity;
      
      uniform float u_enable_glitch;
      uniform float u_enable_vhs;
      uniform float u_enable_curvature;
      uniform float u_enable_noise;
      uniform float u_enable_flicker;
      uniform float u_enable_rgb_split;
      uniform float u_enable_drift_offset;
      uniform float u_enable_blob_dynamics;
      
      uniform float u_overlay_enabled;
      uniform float u_overlay_trans_mode;
      uniform float u_overlay_opacity;
      
      uniform float u_flicker_amount;
      uniform float u_motion_amount;
      uniform vec4 u_layer_visibility;

      uniform float u_poster_softness;
      uniform float u_overlay_softness;
      uniform float u_poster_white_transparency;
      uniform float u_overlay_white_transparency;

      uniform float u_poster_zoom_weight;
      uniform float u_poster_zoom_level;
      uniform vec2 u_poster_crop;
      uniform float u_overlay_zoom_weight;
      
      uniform float u_last_bg_change;
      uniform float u_last_poster_change;
      uniform float u_last_overlay_change;
      
      uniform float u_buildup;
      uniform float u_drop_pulse;

      uniform float u_lava_state;
      uniform float u_lava_next_state;
      uniform float u_lava_mix;
      uniform float u_lava_intensity;
      uniform float u_lava_reveal;
      uniform float u_lava_transformation;
      uniform float u_lava_is_logo;

      uniform float u_represent_pulse;
      uniform float u_represent_wave;
      uniform float u_represent_wave_color;

      uniform float u_beat_phase;
      uniform float u_bar_phase;
      uniform float u_energy_trend;

      float rand(vec2 co){
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      float vnoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float n = i.x + i.y * 57.0 + 113.0 * i.z;

          return mix(mix(mix(rand(vec2(n + 0.0, 0.0)), rand(vec2(n + 1.0, 0.0)), f.x),
                         mix(rand(vec2(n + 57.0, 0.0)), rand(vec2(n + 58.0, 0.0)), f.x), f.y),
                     mix(mix(rand(vec2(n + 113.0, 0.0)), rand(vec2(n + 114.0, 0.0)), f.x),
                         mix(rand(vec2(n + 170.0, 0.0)), rand(vec2(n + 171.0, 0.0)), f.x), f.y), f.z);
      }

      // Lava Space Helpers
      float getLavaFieldBase(vec2 p, float t, float state, float bass, float kick, float clap, float vol) {
          float f = 0.0;
          float lowFreq = (bass + kick) * 0.5;
          float midFreq = (clap + vol) * 0.5;
          
          // Coordinate warping for more organic, asymmetrical "lava tongues"
          vec2 p_warped = p + vec2(sin(p.y * 1.5 + t * 0.5), cos(p.x * 1.2 - t * 0.4)) * 0.3;
          
          // 0: BUBBLE (Classic lava lamp - refined)
          if (state < 0.5) {
              float scale = 2.2;
              f += sin(p_warped.x * scale + t * 0.3) * cos(p_warped.y * scale * 0.7 - t * 0.2);
              // Elongated droplets
              f += sin(p.x * 5.0 + t * 2.0) * sin(p.y * 2.0 - t * 1.5) * 0.3 * (1.0 + midFreq);
              f += cos(p.x * 3.0 - t) * sin(p.y * 4.0 + t * 0.8) * 0.2;
          }
          // 1: WAVE (Flowing horizontal streams - refined)
          else if (state < 1.5) {
              float scale = 1.2;
              f += sin(p_warped.x * scale + t * 0.4 + p_warped.y * 0.6) * 0.7;
              f += sin(p.x * 2.5 - t * (0.8 + midFreq)) * cos(p.y * 0.5 + t * 0.2) * 0.4;
              f += sin(p.y * 3.0 + t * 0.5) * 0.25;
          }
          // 2: SPREAD (Expanding circular ripples - refined)
          else if (state < 2.5) {
              vec2 center = vec2(1.0 + sin(t * 0.3) * 0.5, 1.0 + cos(t * 0.2) * 0.5);
              float dist = length(p_warped - center); 
              f += sin(dist * 3.5 - t * (1.5 + lowFreq * 2.5)) * 0.7;
              f += sin(p.x * 3.0 + t) * cos(p.y * 5.0 - t) * 0.25;
          }
          // 3: DISSOLVE (Scattered particles/noise - refined)
          else if (state < 3.5) {
              float scale = 3.5;
              f += sin(p_warped.x * scale + t) * cos(p_warped.y * scale - t) * 0.4;
              f += rand(p + t) * 0.15 * midFreq;
              f *= smoothstep(1.8, 0.2, length(p - 1.0) + sin(t * 0.4) * 0.6);
          }
          // 4: PULSE (Rhythmic breathing - refined)
          else if (state < 4.5) {
              float pulse = sin(t * (2.0 + lowFreq * 4.0)) * 0.4 + 0.6;
              f += sin(p_warped.x * 1.2) * cos(p_warped.y * 1.2) * pulse;
              f += sin(p.x * 4.0 + t) * cos(p.y * 2.0 - t * 0.5) * 0.2;
          }
          // 5: REVEAL (Minimal fluid, mostly image - refined)
          else if (state < 5.5) {
              f += sin(p_warped.x * 1.2 + t * 0.08) * cos(p_warped.y * 1.2 - t * 0.08) * 0.08;
              f += sin(p.x * 8.0 + t) * 0.015 * midFreq;
          }
          // 6: COLOR BLOOM (Intense color fields - refined)
          else {
              f += sin(p_warped.x * 1.8 + t) * cos(p_warped.y * 1.8 - t) * 0.7;
              f += sin(p.x * 3.5 - t * 1.2) * 0.35 * midFreq;
              f += cos(p.y * 6.0 + t) * 0.15;
          }
          
          return f;
      }

      float getLavaField(vec2 p, float t, float blobDynamics, float bass, float kick, float clap, float vol) {
          float f1 = getLavaFieldBase(p, t, u_lava_state, bass, kick, clap, vol);
          float f2 = getLavaFieldBase(p, t, u_lava_next_state, bass, kick, clap, vol);
          float f = mix(f1, f2, u_lava_mix);
          
          // Apply overall intensity
          f *= u_lava_intensity;
          
          // Sculpted look: non-linear shaping for more defined "masses"
          if (blobDynamics > 0.5) {
              float sign_f = sign(f);
              f = abs(f);
              f = smoothstep(0.0, 1.0, f);
              f = pow(f, 0.75); // Sharpen edges slightly
              f *= sign_f;
          }
          
          // Layered depth: add a secondary, slower moving background field
          float bgField = sin(p.x * 0.5 + t * 0.1) * cos(p.y * 0.4 - t * 0.08) * 0.3;
          f = mix(bgField, f, 0.8);
          
          // Add micro-ripples based on high frequencies
          f += sin(p.x * 25.0 + p.y * 25.0 + t * 8.0) * 0.008 * (0.1 + vol);
          
          return f;
      }

      vec3 getLavaNormal(vec2 p, float t, float blobDynamics, float bass, float kick, float clap, float vol) {
          float eps = 0.02;
          float f = getLavaField(p, t, blobDynamics, bass, kick, clap, vol);
          float fx = getLavaField(p + vec2(eps, 0.0), t, blobDynamics, bass, kick, clap, vol);
          float fy = getLavaField(p + vec2(0.0, eps), t, blobDynamics, bass, kick, clap, vol);
          return normalize(vec3(f - fx, f - fy, eps * 2.0));
      }

      vec2 getCoverUv(vec2 uv, vec2 screenRes, vec2 texRes) {
          float screenAspect = screenRes.x / screenRes.y;
          float texAspect = texRes.x / texRes.y;
          vec2 scale = vec2(1.0, 1.0);
          if (screenAspect > texAspect) {
              scale.y = texAspect / screenAspect;
          } else {
              scale.x = screenAspect / texAspect;
          }
          return (uv - 0.5) * scale + 0.5;
      }

      vec2 getContainUv(vec2 uv, vec2 screenRes, vec2 texRes) {
          float screenAspect = screenRes.x / screenRes.y;
          float texAspect = texRes.x / texRes.y;
          vec2 scale = vec2(1.0, 1.0);
          if (screenAspect > texAspect) {
              scale.x = screenAspect / texAspect;
          } else {
              scale.y = texAspect / screenAspect;
          }
          return (uv - 0.5) * scale + 0.5;
      }

      float getSoftEdge(vec2 uv, vec2 res, float softness) {
          if (softness <= 0.001) return 1.0;
          float aspect = res.x / res.y;
          vec2 dist = min(uv, 1.0 - uv);
          if (aspect > 1.0) {
              dist.x *= aspect;
          } else {
              dist.y /= aspect;
          }
          return smoothstep(0.0, softness, dist.x) * smoothstep(0.0, softness, dist.y);
      }

      vec4 applyOverlayTransparency(vec4 overlay_color, float trans_mode, float opacity) {
          float lum = dot(overlay_color.rgb, vec3(0.299, 0.587, 0.114));
          float alpha_mod = 1.0;
          if (trans_mode == 1.0) {
              // Black Transparent: suppress dark tones
              alpha_mod = smoothstep(0.02, 0.3, lum);
          } else if (trans_mode == 2.0) {
              // White Transparent: suppress bright tones
              alpha_mod = 1.0 - smoothstep(0.7, 0.98, lum);
          }
          overlay_color.a *= alpha_mod * opacity;
          return overlay_color;
      }

      void main() {
        vec2 uv = vUv;
        vec2 originalUv = uv;
        
        // Glitch Events (Global)
        float tear = 0.0;
        float roll = 0.0;
        float noiseBurst = 0.0;
        float flickerBurst = 0.0;
        float rgbSplit = 0.0;

        // Exponential scaling for the "fireworks" magnitude of existing effects
        float effect_mult = u_global_effects + pow(u_global_effects, 4.0) * 2.0;

        // Lava Space Fluid Distortion
        if (u_visual_mode == 1) {
            float t = u_time * 0.2;
            float blobDynamics = u_enable_blob_dynamics;
            
            // Generate fluid field
            float field = getLavaField(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
            
            // Asset Type Detection (Heuristic via Logo Alpha)
            vec2 uv_logo_test = getContainUv(uv, u_resolution, u_res_logo);
            float logoMask = 0.0;
            if (uv_logo_test.x >= 0.0 && uv_logo_test.x <= 1.0 && uv_logo_test.y >= 0.0 && uv_logo_test.y <= 1.0) {
                logoMask = texture2D(u_tex_logo, uv_logo_test).a * u_layer_visibility.w;
            }
            
            // Transformation strength differs: Logos are more controlled
            float transStrength = mix(u_lava_transformation, u_lava_transformation * 0.6, logoMask);
            
            // Contour following: use image luminance to warp the field
            // When transformation is high, the image structure drives the fluid shapes more
            float imgLum = dot(texture2D(u_tex_poster, uv).rgb, vec3(0.299, 0.587, 0.114));
            
            // Logos follow silhouette more strictly, photos follow contrast zones
            float contourWeight = mix(0.6, 1.2, logoMask);
            field += (imgLum - 0.5) * contourWeight * transStrength; 
            
            // Fluid Distortion
            if (u_enable_glitch > 0.5) {
                vec3 normal = getLavaNormal(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
                
                // Distortion intensity scales with transformation and energy
                // Logos have less total deformation
                float fluidIntensity = (0.05 + u_bass * 0.25) * effect_mult * transStrength;
                
                // Use normal for more "physical" distortion
                uv += normal.xy * fluidIntensity;
                
                // Add stronger "spatial" depth displacement
                float depthDisplace = field * 0.15 * effect_mult * transStrength;
                uv += normal.xy * depthDisplace;
                
                // Subtle rotational drift
                float angle = u_time * 0.05 + field * 0.2 * transStrength;
                mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
                uv = (uv - 0.5) * rot + 0.5;
            }
            
            // Stronger breathing zoom moving in on bass
            float spaceZoom = 0.92 - (u_bass * 0.3 * effect_mult * (u_motion_amount + 0.5) * u_lava_intensity);
            // Temporary expansion on peaks
            spaceZoom -= u_drop_pulse * 0.1 * u_lava_intensity;
            spaceZoom = max(0.1, spaceZoom); // Prevent collapse to black
            
            uv = (uv - 0.5) * spaceZoom + 0.5;
        }

        // CONTOUR Mode: Structural Graphic System (Strips, Planes, Panels, Blocks)
        if (u_visual_mode == 3) {
            float stripCount = u_lava_state;
            float reassembly = u_lava_next_state;
            float stripOffsetAmount = u_lava_mix;
            float reliefDepth = u_lava_intensity;
            float shatter = u_lava_reveal;
            float energy = u_lava_transformation;
            float bounce = u_represent_pulse;
            float rasterDensity = u_represent_wave;
            float planeShift = u_represent_wave_color;

            // 0. Lifecycle & Visibility Cycle (Choreographed)
            float cycleTime = u_time * 0.2;
            float visibilityCycle = 0.5 + 0.5 * sin(cycleTime); // 0.0 to 1.0
            // Phases: 0.0-0.3 (Clear), 0.3-0.7 (Partial), 0.7-1.0 (Strong)
            float strongPhase = smoothstep(0.6, 0.9, visibilityCycle);
            float partialPhase = smoothstep(0.2, 0.6, visibilityCycle) * (1.0 - strongPhase);
            float clearPhase = 1.0 - partialPhase - strongPhase;
            
            // Global reassembly override based on cycle
            float cycleReassembly = mix(reassembly, 1.0, clearPhase * 0.8);
            
            // 1. Structural Bounce (Kick driven)
            vec2 centerDir = originalUv - 0.5;
            uv = originalUv + centerDir * bounce * 0.1 * reliefDepth * (1.0 - clearPhase);

            // 2. Image-Derived Segmentation (Shape Families)
            // Use low-res luminance to drive structure
            vec2 lowResUv = floor(originalUv * 8.0) / 8.0;
            float imgLum = dot(texture2D(u_tex_poster, lowResUv).rgb, vec3(0.299, 0.587, 0.114));
            
            // Determine Shape Family based on time and image content
            float familySelector = fract(cycleTime * 0.5 + imgLum * 0.2);
            
            if (strongPhase > 0.1 || partialPhase > 0.1) {
                float structuralWeight = mix(partialPhase * 0.5, 1.0, strongPhase);
                
                if (familySelector < 0.25) {
                    // STRIPS: Wide horizontal architectural slicing
                    float stripId = floor(uv.y * (stripCount * 0.5 + 2.0));
                    float slide = (fract(stripId * 0.5) > 0.5 ? 1.0 : -1.0) * stripOffsetAmount * energy * 0.3;
                    uv.x += slide * structuralWeight;
                } else if (familySelector < 0.5) {
                    // PANELS: Broad vertical structural bands
                    float panelId = floor(uv.x * 2.0);
                    float shift = (fract(panelId * 0.5) > 0.5 ? 1.0 : -1.0) * planeShift * energy * 0.2;
                    uv.y += shift * structuralWeight;
                } else if (familySelector < 0.75) {
                    // SLABS: Large rectangular image-derived blocks
                    vec2 slabGrid = vec2(3.0, 5.0);
                    vec2 slabId = floor(uv * slabGrid);
                    float slabRand = rand(slabId);
                    vec2 slabShift = (vec2(slabRand, rand(slabId + 1.0)) - 0.5) * shatter * 0.2;
                    uv += slabShift * structuralWeight;
                } else {
                    // RELIEF: Stepped image-derived planes
                    float steppedLum = floor(imgLum * 5.0) / 5.0;
                    float reliefWarp = steppedLum * 0.1 * reliefDepth;
                    uv += vec2(reliefWarp, -reliefWarp) * structuralWeight;
                }
            }

            // 3. Pseudo-3D Relief (Derived from Image)
            vec4 posterSample = texture2D(u_tex_poster, uv);
            float lum = dot(posterSample.rgb, vec3(0.299, 0.587, 0.114));
            vec2 tilt = vec2(lum - 0.5) * planeShift * 0.1 * reliefDepth * (1.0 - clearPhase);
            uv += tilt;

            // 4. Rhythmic Reassembly
            uv = mix(uv, originalUv, cycleReassembly);

            // 5. Integrated Raster (Detail)
            if (u_enable_vhs > 0.5) {
                float lineFreq = 30.0 + rasterDensity * 150.0;
                float lines = sin(uv.y * lineFreq + u_time * 2.0) * 0.5 + 0.5;
                float edge = abs(lum - dot(texture2D(u_tex_poster, uv + 0.002).rgb, vec3(0.299, 0.587, 0.114)));
                float rasterEffect = smoothstep(0.4, 0.6, lines) * (0.1 + edge * 2.0) * reliefDepth * strongPhase;
                uv += vec2(rasterEffect * 0.005);
            }
            
            if (u_enable_rgb_split > 0.5) {
                rgbSplit += (0.002 + shatter * 0.01) * energy * (1.0 - clearPhase);
            }
        }

        // Curvature / Lens
        if (u_enable_curvature > 0.5) {
            vec2 centerUv = uv - 0.5;
            float rsq = centerUv.x * centerUv.x + centerUv.y * centerUv.y;
            if (u_visual_mode == 0) {
                // CRT Curvature
                centerUv += centerUv * (rsq * 0.1 * effect_mult);
            } else if (u_visual_mode == 1) {
                // Liquid Lens
                float bulge = sin(rsq * 8.0 - u_time * 1.5) * 0.03 * effect_mult * (1.0 + u_bass * 2.0);
                centerUv += centerUv * bulge;
            } else if (u_visual_mode == 2) {
                // Represent Perspective / Subtle Bend
                float bend = rsq * 0.05 * (1.0 + u_bass * 0.5);
                centerUv += centerUv * bend;
                
                // Subtle perspective tilt
                centerUv.x *= 1.0 + centerUv.y * 0.05 * sin(u_time * 0.2);
            } else if (u_visual_mode == 3) {
                // Relief Bend: Subtle cylindrical warp
                float bend = centerUv.x * centerUv.x * 0.1 * effect_mult;
                centerUv.y += bend * (1.0 + u_bass);
            }
            uv = centerUv + 0.5;
        }

        // Smooth Drift (Base state) - use u_bass for groove
        // Background -> almost static
        float driftX = sin(u_time * 0.1 + uv.y * 0.5) * 0.003 * effect_mult * u_motion_amount * (1.0 + u_bass) * (1.0 - u_buildup * 0.5);
        float driftY = cos(u_time * 0.08 + uv.x * 0.4) * 0.003 * effect_mult * u_motion_amount * (1.0 + u_bass) * (1.0 - u_buildup * 0.5);
        
        // Add Drift Offset (Interval-based, subtle)
        if (u_enable_drift_offset > 0.5) {
            float cycle = mod(u_time, 8.0); // 8 second cycle
            // Smoothly fade in over 1s, hold for 1s, fade out over 1s
            float trigger = smoothstep(0.0, 1.0, cycle) * smoothstep(3.0, 2.0, cycle);
            
            float cycleId = floor(u_time / 8.0);
            float randX = (rand(vec2(cycleId, 1.0)) - 0.5) * 2.0;
            float randY = (rand(vec2(1.0, cycleId)) - 0.5) * 2.0;
            
            // Base drift is small, scales with bass. If bass is 0, drift is minimal.
            float driftIntensity = 0.01 + (u_bass * 0.03); 
            
            driftX += randX * driftIntensity * trigger;
            driftY += randY * driftIntensity * trigger;
        }

        uv += vec2(driftX, driftY);
        
        // Micro jitter during buildup
        uv += vec2(rand(uv + u_time), rand(uv - u_time)) * 0.003 * u_buildup;

        if (u_visual_mode == 0) {
            if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
                float active_intensity = u_glitch_intensity * (0.5 + u_flicker_amount * 2.5);
                if (u_glitch_type == 1) {
                    // Dark Flicker Burst (compression feel)
                    flickerBurst = -step(0.5, fract(u_glitch_time * 15.0)) * active_intensity * 0.5;
                } else if (u_glitch_type == 2) {
                    // Horizontal Tear
                    float tearBand = step(0.9, sin(uv.y * 50.0 + u_glitch_time * 20.0));
                    tear = (rand(vec2(uv.y * 20.0, u_time)) - 0.5) * 0.3 * active_intensity * tearBand;
                    rgbSplit += 0.15 * active_intensity * tearBand;
                } else if (u_glitch_type == 3) {
                    // Tracking Roll
                    roll = fract(u_glitch_time * 5.0) * active_intensity * 0.2;
                    uv.y = fract(uv.y + roll);
                } else if (u_glitch_type == 4) {
                    // Noise Burst
                    noiseBurst = active_intensity * 0.8;
                } else if (u_glitch_type == 5) {
                    // Subtle Pixel Sort (simulated)
                    float sortBand = step(0.8, sin(uv.y * 15.0 + u_time * 5.0));
                    uv.x -= sortBand * (rand(vec2(uv.y, 0.0)) * 0.2 * active_intensity);
                } else if (u_glitch_type == 6) {
                    // RGB Separation Burst
                    rgbSplit += 0.3 * active_intensity;
                    uv.x += (rand(vec2(u_time, uv.y)) - 0.5) * 0.05 * active_intensity;
                } else if (u_glitch_type == 7) {
                    // Distortion Wave
                    float wave = sin(uv.y * 10.0 + u_glitch_time * 10.0) * 0.15 * active_intensity;
                    uv.x += wave;
                    rgbSplit += abs(wave) * 0.8;
                } else if (u_glitch_type == 8) {
                    // Stutter / Jitter
                    uv.x += (step(0.5, rand(vec2(u_time, 1.0))) - 0.5) * 0.15 * active_intensity;
                    uv.y += (step(0.5, rand(vec2(1.0, u_time))) - 0.5) * 0.15 * active_intensity;
                }
            }
            
            // Clap adds quick horizontal crackle/tear (Accent)
            if (u_enable_glitch > 0.5 && u_clap > 0.1) {
                float clapTearBand = step(0.9, sin(uv.y * 60.0 + u_time * 30.0));
                tear += (rand(vec2(uv.y * 10.0, u_time)) - 0.5) * 0.08 * u_clap * effect_mult * u_flicker_amount * clapTearBand;
                rgbSplit += 0.05 * u_clap * u_flicker_amount * clapTearBand;
            }
        }

        // Hat adds tiny noise modulation (Subtle high frequency)
        if (u_enable_noise > 0.5 && u_hat > 0.1) {
            noiseBurst += u_hat * 0.05;
        }

        uv.x += tear;

        // RGB Shift (tied to kick for impact/pressure)
        float shift = 0.0;
        if (u_enable_rgb_split > 0.5) {
            shift = 0.001 * effect_mult * (1.0 + u_bass);
            shift += rgbSplit;
            shift += u_kick * 0.005 * effect_mult; // Pressure distortion on kick
            
            if (u_visual_mode == 0) {
                shift += u_represent_wave * 0.015; // Add recoil to RGB split
            }
        }
        
        // Internal surface RGB shift (micro shift on high frequencies)
        shift += u_hat * 0.0015;
        
        // BG (Cover)
        float bg_age = u_time - u_last_bg_change;
        float bg_fade = smoothstep(0.0, 0.5, bg_age);
        
        vec2 bg_offset = vec2(0.0);
        if (u_visual_mode == 0) {
            bg_offset.y += u_represent_pulse * 0.1; // Aggressive background bounce
            bg_offset.x -= u_represent_wave * 0.05;
        }
        
        vec2 uv_bg_r = getCoverUv(uv + vec2(shift, 0.0) + bg_offset, u_resolution, u_res_bg);
        vec2 uv_bg_g = getCoverUv(uv + bg_offset, u_resolution, u_res_bg);
        vec2 uv_bg_b = getCoverUv(uv - vec2(shift, 0.0) + bg_offset, u_resolution, u_res_bg);
        
        vec4 col_bg;
        col_bg.r = texture2D(u_tex_bg, uv_bg_r).r;
        col_bg.g = texture2D(u_tex_bg, uv_bg_g).g;
        col_bg.b = texture2D(u_tex_bg, uv_bg_b).b;
        col_bg.a = u_layer_visibility.x * bg_fade;

        if (u_visual_mode == 2) {
            // REPRESENT MODE: Premium Dark Background with loaded asset
            vec3 darkBase = vec3(0.05, 0.05, 0.08);
            
            // Subtle Grid
            vec2 gridUv = uv * 20.0;
            vec2 grid = abs(fract(gridUv - 0.5) - 0.5);
            float gridLine = 1.0 - smoothstep(0.0, 0.05, min(grid.x, grid.y));
            
            darkBase += gridLine * 0.02 * (0.5 + 0.5 * sin(u_time * 0.5));
            
            // Atmospheric Waves
            float wavePos = fract(uv.y * 0.5 - u_time * 0.1 + u_represent_wave);
            float wave = smoothstep(0.1, 0.0, abs(wavePos - 0.5));
            
            vec3 waveColor = u_represent_wave_color > 0.5 ? vec3(0.8, 0.1, 0.1) : vec3(0.1, 0.3, 0.8);
            darkBase += waveColor * wave * u_represent_wave * 0.3;
            
            // Atmospheric Glow
            float glow = u_represent_pulse * 0.15;
            darkBase += vec3(0.1, 0.15, 0.2) * glow;
            
            // Mix loaded background asset (darkened/tinted for premium look)
            float lum = dot(col_bg.rgb, vec3(0.299, 0.587, 0.114));
            vec3 tintedBg = col_bg.rgb * 0.4 + vec3(0.05, 0.05, 0.1) * lum; // Darken and cool tint
            
            // Add subtle glitter/sparkle based on luminance and time
            float sparkle = pow(fract(sin(dot(uv + u_time * 0.1, vec2(12.9898, 78.233))) * 43758.5453), 20.0) * lum;
            tintedBg += vec3(sparkle) * 0.5;

            col_bg.rgb = darkBase + (tintedBg * col_bg.a);
            col_bg.a = 1.0; // Background is always opaque at the base
        } else {
            col_bg.rgb *= col_bg.a;
        }

        // FG (Contain-Plus) - Poster -> Main Movement
        // Enhanced Background Fill (Blurred & Darkened) derived from the poster itself
        // This fills gaps during rotation, zoom, or when the poster is contained
        // Use originalUv for stable background fill to prevent black gaps during transforms
        vec2 uv_poster_fill = getCoverUv(originalUv, u_resolution, u_res_poster);
        // Scale it up (zoom out) to ensure it covers even during transforms
        uv_poster_fill = (uv_poster_fill - 0.5) * 0.5 + 0.5; 
        
        float poster_age = u_time - u_last_poster_change;
        float poster_fade = smoothstep(0.0, 0.3, poster_age);
        
        // 9-tap blur for the background fill
        vec4 col_poster_bg = vec4(0.0);
        float bSize = 0.04; // Increased blur size for better integration
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill) * 0.2;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill + vec2(bSize, 0.0)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill - vec2(bSize, 0.0)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill + vec2(0.0, bSize)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill - vec2(0.0, bSize)) * 0.15;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill + vec2(bSize, bSize)) * 0.1;
        col_poster_bg += texture2D(u_tex_poster, uv_poster_fill - vec2(bSize, bSize)) * 0.1;
        
        // Darken significantly for atmospheric feel
        col_poster_bg.rgb *= 0.2 * poster_fade;
        
        // Add a soft vignette to the fill layer to blend into black
        vec2 fillVignetteUv = uv * (1.0 - uv.yx);
        float fillVignette = fillVignetteUv.x * fillVignetteUv.y * 15.0;
        fillVignette = pow(fillVignette, 0.4);
        col_poster_bg.rgb *= fillVignette;

        // Add glitch transition effect when poster is new
        float transition_glitch = (1.0 - smoothstep(0.0, 0.4, poster_age)) * u_motion_amount;
        vec2 poster_offset = vec2(sin(u_time * 0.1) * 0.01, cos(u_time * 0.08) * 0.01) * effect_mult * u_motion_amount * 2.0;
        poster_offset += vec2(rand(vec2(u_time, uv.y)) - 0.5, rand(vec2(uv.x, u_time)) - 0.5) * 0.1 * transition_glitch;
        
        float current_zoom = u_zoom;
        if (u_visual_mode == 0) {
            // Signal Glitch: Add post-drop bounce and recoil
            current_zoom += u_represent_pulse * 0.6; // Strong forward bounce
            current_zoom -= u_represent_wave * 0.4;  // Elastic recoil
            
            // Add physical push to offset
            poster_offset.y += u_represent_pulse * 0.2;
            poster_offset.x += (rand(vec2(u_time, 1.0)) - 0.5) * u_represent_wave * 0.15;
            
            // Aggressive shake
            poster_offset += vec2(rand(vec2(u_time, 2.0)) - 0.5, rand(vec2(u_time, 3.0)) - 0.5) * (u_represent_pulse + u_represent_wave) * 0.25;
        }
        
        vec2 uv_poster = getContainUv(uv + poster_offset + u_poster_crop, u_resolution, u_res_poster);
        // Scale down slightly to fit well, apply beat zoom, and apply poster zoom level
        uv_poster = (uv_poster - 0.5) * ((1.02 - current_zoom * u_poster_zoom_weight) / u_poster_zoom_level) + 0.5;
        
        vec4 col_poster = vec4(0.0);
        if (uv_poster.x >= 0.0 && uv_poster.x <= 1.0 && uv_poster.y >= 0.0 && uv_poster.y <= 1.0) {
            vec2 uv_poster_r = uv_poster + vec2(shift + transition_glitch * 0.05, 0.0);
            vec2 uv_poster_b = uv_poster - vec2(shift + transition_glitch * 0.05, 0.0);
            
            // Add RGB split recoil for Signal Glitch
            if (u_visual_mode == 0 && u_enable_rgb_split > 0.5) {
                uv_poster_r.x += u_represent_wave * 0.1;
                uv_poster_b.x -= u_represent_wave * 0.1;
            }
            
            col_poster.r = texture2D(u_tex_poster, uv_poster_r).r;
            col_poster.g = texture2D(u_tex_poster, uv_poster).g;
            col_poster.b = texture2D(u_tex_poster, uv_poster_b).b;
            col_poster.a = texture2D(u_tex_poster, uv_poster).a;
            col_poster.a *= getSoftEdge(uv_poster, u_res_poster, u_poster_softness);
            
            // Fade in
            col_poster.a *= poster_fade;
            
            // Slightly reduce poster visibility during buildup
            col_poster.a *= (1.0 - u_buildup * 0.15);
            col_poster.a *= u_layer_visibility.y;
        }

        // Overlay (Accents, subtle texture changes)
        // Movement is minimal, tied to groove, with occasional jumps
        float overlay_age = u_time - u_last_overlay_change;
        vec2 overlay_jump = vec2(0.0);
        if (u_motion_amount > 0.5 && step(0.95, rand(vec2(floor(u_time * 2.0), 1.0))) > 0.5) {
            overlay_jump = vec2(rand(vec2(u_time, 1.0)) - 0.5, rand(vec2(1.0, u_time)) - 0.5) * 0.5;
        }
        
        vec2 overlay_offset = vec2(cos(u_time * 0.1) * 0.005, sin(u_time * 0.08) * 0.005) * effect_mult * u_motion_amount;
        
        float overlay_zoom = current_zoom;
        if (u_visual_mode == 0) {
            // Overlay reacts differently to bounce (more snappy, less heavy)
            overlay_offset.y -= u_represent_pulse * 0.15;
            overlay_zoom += u_represent_wave * 0.5; // Recoil expands overlay
        }
        
        vec2 uv_overlay = getContainUv(uv + overlay_offset + overlay_jump, u_resolution, u_res_overlay);
        // Scale down more (logos should be tasteful), and apply minimal beat zoom
        uv_overlay = (uv_overlay - 0.5) * (1.5 - overlay_zoom * u_overlay_zoom_weight) + 0.5;
        
        // Glitch distortion on overlay
        if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
            uv_overlay.x += (rand(vec2(uv_overlay.y * 10.0, u_time)) - 0.5) * 0.15 * u_glitch_intensity;
            if (u_visual_mode == 0) uv_overlay.y += (rand(vec2(u_time, uv_overlay.x * 10.0)) - 0.5) * 0.1 * u_glitch_intensity;
        }
        
        vec4 col_overlay = vec4(0.0);
        if (u_layer_visibility.z > 0.5 && u_overlay_enabled > 0.5) {
            if (uv_overlay.x >= 0.0 && uv_overlay.x <= 1.0 && uv_overlay.y >= 0.0 && uv_overlay.y <= 1.0) {
                col_overlay = texture2D(u_tex_overlay, uv_overlay);
                col_overlay.a *= getSoftEdge(uv_overlay, u_res_overlay, u_overlay_softness);
                
                col_overlay = applyOverlayTransparency(col_overlay, u_overlay_trans_mode, u_overlay_opacity);
                
                // Occasional overlay accent based on groove/randomness
                float slow_pulse = sin(u_time * 0.2) * sin(u_time * 0.33);
                float overlay_accent = smoothstep(0.6, 1.0, sin(u_time * 0.5 + u_bass * 2.0) * slow_pulse);
                col_overlay.a *= 0.3 + 0.7 * overlay_accent; // Base 30%, spikes to 100% occasionally
                
                // Slightly reduce overlay intensity during buildup
                col_overlay.a *= (1.0 - u_buildup * 0.2);
            }
        }

        // Logo Layer
        vec2 logo_jump = vec2(0.0);
        if (u_motion_amount > 0.5 && step(0.98, rand(vec2(floor(u_time * 4.0), 2.0))) > 0.5) {
            logo_jump = vec2(rand(vec2(u_time, 2.0)) - 0.5, rand(vec2(2.0, u_time)) - 0.5) * 0.8;
        }
        
        if (u_visual_mode == 0) {
            // Logo bounce (very snappy, sharp)
            logo_jump.y -= u_represent_pulse * 0.2;
            logo_jump.x += u_represent_wave * 0.1;
        }
        
        vec2 uv_logo = getContainUv(uv + logo_jump, u_resolution, u_res_logo);
        
        // Glitch distortion on logo
        if (u_enable_glitch > 0.5 && u_glitch_intensity > 0.0) {
            uv_logo.x += (rand(vec2(uv_logo.y * 20.0, u_time)) - 0.5) * 0.2 * u_glitch_intensity;
            if (u_visual_mode == 0) uv_logo.y += (rand(vec2(u_time, uv_logo.x * 20.0)) - 0.5) * 0.15 * u_glitch_intensity;
        }
        
        float logo_age = u_time - u_last_overlay_change;
        float logo_fade = smoothstep(0.0, 0.5, logo_age);
        
        vec4 col_logo = vec4(0.0);
        if (uv_logo.x >= 0.0 && uv_logo.x <= 1.0 && uv_logo.y >= 0.0 && uv_logo.y <= 1.0) {
            col_logo = texture2D(u_tex_logo, uv_logo);
            
            if (u_visual_mode == 0) {
                // Signal Glitch: Sharp scale bounce
                float logoPulse = 1.0 + u_represent_pulse * 0.4 - u_represent_wave * 0.2;
                vec2 pulsedUv = (uv_logo - 0.5) / logoPulse + 0.5;
                if (pulsedUv.x >= 0.0 && pulsedUv.x <= 1.0 && pulsedUv.y >= 0.0 && pulsedUv.y <= 1.0) {
                    col_logo = texture2D(u_tex_logo, pulsedUv);
                }
            } else if (u_visual_mode == 2) {
                // REPRESENT MODE: Enhanced Logo
                // Subtle scaling pulse
                float logoPulse = 1.0 + u_bass * 0.05 * u_represent_pulse;
                vec2 pulsedUv = (uv_logo - 0.5) / logoPulse + 0.5;
                if (pulsedUv.x >= 0.0 && pulsedUv.x <= 1.0 && pulsedUv.y >= 0.0 && pulsedUv.y <= 1.0) {
                    col_logo = texture2D(u_tex_logo, pulsedUv);
                }
                
                // Logo Glow
                float logoGlow = u_represent_pulse * 0.5 + u_bass * 0.5;
                col_logo.rgb += col_logo.rgb * logoGlow * 0.5;
                
                // Light pass sweep
                float sweepPos = fract(u_time * 0.3);
                float sweep = smoothstep(0.1, 0.0, abs(uv_logo.x - sweepPos));
                col_logo.rgb += vec3(1.0) * sweep * 0.3;
            }
            
            col_logo.a *= u_layer_visibility.w;
            col_logo.a *= logo_fade; // Smooth transition
        }

        // Flash Layer
        vec2 uv_flash = getContainUv(uv, u_resolution, u_res_flash);
        vec4 col_flash = vec4(0.0);
        if (uv_flash.x >= 0.0 && uv_flash.x <= 1.0 && uv_flash.y >= 0.0 && uv_flash.y <= 1.0) {
            col_flash = texture2D(u_tex_flash, uv_flash);
            col_flash.a *= u_drop_pulse; // Only visible during peaks/drops
        }

        // Blend
        vec4 col = col_bg;
        
        if (u_visual_mode == 4) {
            // KALEIDOSCOPE MODE (4) - Repaired & Rebalanced
            float sides = u_lava_state;
            float shape_type = u_lava_next_state;
            float shape_morph = u_lava_mix;
            float mirror_depth = u_lava_intensity;
            float tunnel_depth = u_lava_reveal;
            float rotation_angle = u_lava_transformation; // Integrated angle from JS
            float center_lock = u_lava_is_logo;
            float center_pulse = u_represent_pulse;
            float shimmer = u_represent_wave;
            
            // 0. Rotation: Subtle & Slow
            // We use the integrated angle but add a tiny time-based drift for life
            float slow_rotation = rotation_angle + u_time * 0.005;
            
            vec2 k_uv = uv - 0.5;
            float r = length(k_uv);
            
            // A. RIPPLE (Radial wave movement)
            // Pattern breathing from center outward, driven by shimmer/highs
            float ripple_freq = 10.0 + u_high * 10.0;
            float ripple_speed = 1.0;
            float ripple_amp = 0.012 * (0.3 + shimmer * 0.7);
            float ripple = sin(r * ripple_freq - u_time * ripple_speed) * ripple_amp;
            r += ripple;
            
            float a = atan(k_uv.y, k_uv.x) + slow_rotation;
            
            // 1. Radial Symmetry & Mirroring
            float tau = 6.283185;
            float sides_safe = max(3.0, sides);
            
            // B. REASSEMBLY (Internal pieces reorganize)
            // Modulate slice angle with mids for structural shifting
            float reassembly = sin(u_time * 0.08) * 0.015 + u_mid * 0.04;
            float slice = (tau / sides_safe) * (1.0 + reassembly);
            
            // Center Lock: Reduces reassembly and rotation if active
            if (center_lock > 0.5) {
                slice = tau / sides_safe;
            }
            
            float angle_in_slice = mod(a, slice);
            float mirror_a = abs(angle_in_slice - slice * 0.5);
            
            // D. INTERLOCKING (Shapes slide into each other)
            // Subtle angular offset based on radius and mids
            mirror_a += sin(r * 4.0 - u_time * 0.25) * 0.025 * u_mid;
            
            // C. BOUNCE (Elastic pulse with groove)
            // Internal forms pulse and rebound with kick
            float bounce = 1.0 + sin(u_time * 0.35) * 0.01 + u_kick * 0.08;
            
            // 2. Spatial Tunnel & Breathing
            float tunnel_zoom = 1.0 + fract(tunnel_depth * 0.1) * 1.5;
            float radial_zoom = (0.8 + center_pulse * 0.3) * tunnel_zoom * bounce;
            radial_zoom = max(0.05, radial_zoom);
            
            // E. PATTERN DRIFT (Internal migration)
            // Slow internal migration of image-derived shapes
            vec2 internal_drift = vec2(
                sin(u_time * 0.03 + u_bass * 0.15),
                cos(u_time * 0.05 + u_bass * 0.1)
            ) * 0.07;
            
            // Parallax offset based on radius
            vec2 drift_parallax = u_poster_crop * (1.0 + r * 0.3);
            
            // 4. Coordinate Transformation
            vec2 polar_uv = vec2(cos(mirror_a), sin(mirror_a)) * r;
            polar_uv /= radial_zoom;
            polar_uv += drift_parallax + internal_drift;
            
            // 5. Shape Family Evolution (Dancing internal pieces)
            float shape_field = 0.0;
            vec2 shape_uv = (polar_uv - 0.5) * 2.0;
            
            if (u_enable_noise > 0.5) {
                // SHAPE MORPH enabled
                float morph_speed = u_time * 0.4;
                if (shape_type < 0.5) {
                    // OVALS
                    shape_field = length(shape_uv * vec2(1.0, 0.5 + shape_morph));
                } else if (shape_type < 1.5) {
                    // BLOBS
                    shape_field = length(shape_uv) + sin(atan(shape_uv.y, shape_uv.x) * 5.0 + morph_speed) * 0.2 * shape_morph;
                } else if (shape_type < 2.5) {
                    // RECTS
                    vec2 q = abs(shape_uv) - vec2(0.5 + shape_morph * 0.5);
                    shape_field = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
                } else {
                    // STRIPES
                    shape_field = abs(shape_uv.x) + sin(shape_uv.y * 10.0 + morph_speed) * 0.1 * shape_morph;
                }
                polar_uv += shape_uv * (1.0 - smoothstep(0.0, 0.1, abs(shape_field - 0.5))) * 0.03;
            }
            
            // 6. Layered Compositing
            vec4 k_poster = texture2D(u_tex_poster, polar_uv + 0.5);
            
            // Add shimmer detail
            float detail_noise = vnoise(vec3(polar_uv * 15.0, u_time * 0.5)) * shimmer;
            k_poster.rgb += detail_noise * 0.15;
            
            // Center-out expansion mask
            float center_mask = smoothstep(0.0, 0.7, r * (1.0 + center_pulse * 0.5));
            
            // Multi-layer depth (VHS toggle as "Multi-Layer")
            if (u_enable_vhs > 0.5) {
                // Secondary layer with different interlocking drift
                float r2 = r * 1.25;
                float mirror_a2 = mirror_a + sin(u_time * 0.15) * 0.12;
                vec2 polar_uv2 = vec2(cos(mirror_a2), sin(mirror_a2)) * r2;
                polar_uv2 /= radial_zoom * 1.15;
                polar_uv2 += drift_parallax * 0.7 + internal_drift * -0.6;
                
                vec4 layer2 = texture2D(u_tex_poster, polar_uv2 + 0.5);
                k_poster = mix(k_poster, layer2, 0.45 * (1.0 - center_mask));
            }
            
            // Merge Overlay into the pattern
            if (u_layer_visibility.z > 0.5 && u_overlay_enabled > 0.5) {
                if (u_enable_rgb_split > 0.5) {
                    // OVERLAY MERGE
                    vec2 overlay_k_uv = getContainUv(polar_uv + 0.5, u_resolution, u_res_overlay);
                    vec4 mirrored_overlay = texture2D(u_tex_overlay, overlay_k_uv);
                    mirrored_overlay = applyOverlayTransparency(mirrored_overlay, u_overlay_trans_mode, u_overlay_opacity);
                    k_poster = mix(k_poster, mirrored_overlay, mirrored_overlay.a * 0.5);
                } else {
                    col = mix(col, col_overlay, col_overlay.a);
                }
            }
            
            // Final Kaleidoscope Color
            float mirror_mix = max(0.15, mirror_depth);
            col = mix(col, k_poster, mirror_mix);

            // Depth Logo (Logo appears in front of the tunnel)
            if (col_logo.a > 0.01) {
                if (u_enable_flicker > 0.5) {
                    // DEPTH LOGO
                    vec2 logo_parallax = u_poster_crop * 0.15 + vec2(sin(u_time * 0.2), cos(u_time * 0.25)) * 0.02;
                    vec2 uv_logo_spatial = getContainUv(uv + logo_parallax, u_resolution, u_res_logo);
                    vec4 spatial_logo = texture2D(u_tex_logo, uv_logo_spatial);
                    
                    // Logo pulse and glow
                    float logo_glow = center_pulse * 0.4;
                    spatial_logo.rgb += spatial_logo.rgb * logo_glow;
                    
                    col.rgb = mix(col.rgb, spatial_logo.rgb, spatial_logo.a * u_layer_visibility.w);
                } else {
                    col.rgb = mix(col.rgb, col_logo.rgb, col_logo.a);
                }
            }
        }
        
        if (u_visual_mode != 2 && u_visual_mode != 4) {
            // Add darkened Poster cover to create a thematic backdrop
            col.rgb += col_poster_bg.rgb * 0.5; 
            // Alpha blend Poster
            col.rgb = mix(col.rgb, col_poster.rgb, col_poster.a);
            // Screen blend Overlay
            col.rgb = 1.0 - (1.0 - col.rgb) * (1.0 - col_overlay.rgb * col_overlay.a * 0.8);
        }
        
        // Flash Blend
        float isDark = step(0.2, rand(vec2(floor(u_time * 4.0), 1.0)));
        if (isDark > 0.5) {
            // Multiply blend for dark flash
            col.rgb = mix(col.rgb, col.rgb * (1.0 - col_flash.rgb), col_flash.a);
        } else {
            // Screen blend for bright flash
            col.rgb = 1.0 - (1.0 - col.rgb) * (1.0 - col_flash.rgb * col_flash.a);
        }

        // Color Mode
        float gray = dot(col.rgb, vec3(0.299, 0.587, 0.114));
        
        if (u_visual_mode == 0) {
            // Signal Glitch Colors
            if (u_color_mode == 0) { // mostly-mono
                col.rgb = mix(vec3(gray), col.rgb, 0.05 + u_vol * 0.1);
            } else if (u_color_mode == 1) { // mono-accent
                float burst = step(0.85, u_vol) * step(0.8, rand(vec2(u_time, 2.0)));
                col.rgb = mix(vec3(gray), col.rgb, 0.1 + burst * 0.7);
            } else if (u_color_mode == 2) { // mixed
                col.rgb = mix(vec3(gray), col.rgb, 0.4 + u_vol * 0.3);
            } else if (u_color_mode == 3) { // spectral-rgb
                float burst = step(0.85, rand(floor(uv * 30.0) + u_time)) * u_vol;
                vec3 saturated = col.rgb * col.rgb * 2.0;
                saturated.r *= 1.0 + u_kick * 0.5;
                saturated.g *= 1.0 + u_hat * 0.5;
                saturated.b *= 1.0 + u_bass * 0.5;
                col.rgb = mix(col.rgb, clamp(saturated, 0.0, 1.0), 0.2 + burst * 0.5);
            }
        } else if (u_visual_mode == 3) {
            // CONTOUR Mode: Structural, Graphic, Spatial
            float reassembly = u_lava_next_state;
            float stripCount = u_lava_state;
            float globalEnergy = u_lava_transformation;
            float bounce = u_represent_pulse;
            float planeShift = u_represent_wave_color;
            float reliefDepth = u_lava_intensity;
            
            // 0. Lifecycle & Visibility Cycle
            float cycleTime = u_time * 0.2;
            float visibilityCycle = 0.5 + 0.5 * sin(cycleTime);
            float strongPhase = smoothstep(0.6, 0.9, visibilityCycle);
            float partialPhase = smoothstep(0.2, 0.6, visibilityCycle) * (1.0 - strongPhase);
            float clearPhase = 1.0 - partialPhase - strongPhase;
            
            // 1. Structural Sampling
            vec2 structuralUv = uv;
            
            // Sample image with structural UVs
            vec2 uv_poster_struct = getContainUv(structuralUv + u_poster_crop, u_resolution, u_res_poster);
            uv_poster_struct = (uv_poster_struct - 0.5) * (1.0 / u_poster_zoom_level) + 0.5;
            
            if (uv_poster_struct.x >= 0.0 && uv_poster_struct.x <= 1.0 && uv_poster_struct.y >= 0.0 && uv_poster_struct.y <= 1.0) {
                col = texture2D(u_tex_poster, uv_poster_struct);
                col.a *= getSoftEdge(uv_poster_struct, u_res_poster, u_poster_softness);
            } else {
                col = col_poster_bg;
            }
            
            float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
            
            // 2. Structural Patterns (Image-Derived)
            // Contour Lines (Depth Relief)
            float contourScale = 8.0 + u_bass * 12.0 * globalEnergy;
            float contourLines = abs(fract(lum * contourScale + u_time * 0.05) - 0.5) * 2.0;
            contourLines = smoothstep(0.35, 0.45, contourLines);
            
            // Structural Hatch (Replacing Dot Raster)
            float hatchScale = 40.0 + u_represent_wave * 60.0;
            float hatchLines = sin(structuralUv.y * hatchScale + structuralUv.x * hatchScale * 0.5);
            float hatchThreshold = mix(0.9, 0.1, lum);
            float structuralHatch = smoothstep(hatchThreshold - 0.1, hatchThreshold + 0.1, hatchLines);
            
            // 3. Color Modes (Integrated with Visibility Cycle)
            vec3 finalCol = col.rgb;
            
            if (u_color_mode == 0) { // print-black
                float graphic = mix(structuralHatch, contourLines, 0.4);
                vec3 bw = vec3(smoothstep(0.3, 0.7, lum));
                finalCol = mix(bw, vec3(graphic), strongPhase * 0.85);
            } else if (u_color_mode == 1) { // topo-relief
                vec3 base = vec3(0.04, 0.06, 0.08);
                vec3 accent = vec3(0.95, 0.85, 0.65);
                vec3 topo = mix(base, accent * (0.5 + lum * 0.5), contourLines);
                finalCol = mix(col.rgb, topo, partialPhase * 0.4 + strongPhase);
            } else { // spectral-contour
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(1.0, 1.0, 1.0);
                vec3 d = vec3(0.0, 0.33, 0.67);
                vec3 pal = a + b * cos(6.28318 * (c * lum + d + u_time * 0.04));
                vec3 spectral = mix(pal * 0.2, pal, contourLines);
                finalCol = mix(col.rgb, spectral, partialPhase * 0.3 + strongPhase * 0.95);
            }
            
            col.rgb = mix(col.rgb, finalCol, 1.0 - clearPhase * 0.6);
            
            // 4. Structural Shards (Replacing Random Dots)
            if (u_lava_reveal > 0.05) {
                vec2 shardId = floor(uv * 4.0);
                float shard = step(0.97 - u_lava_reveal * 0.03, rand(shardId + floor(u_time * 4.0)));
                col.rgb = mix(col.rgb, vec3(1.0), shard * strongPhase * 0.7);
            }
            
            col.a *= u_layer_visibility.y;
        } else if (u_visual_mode == 1) {
            // Lava Space Colors & Material Behavior
            float t = u_time * 0.2;
            float blobDynamics = u_enable_blob_dynamics;
            float field = getLavaField(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
            vec3 normal = getLavaNormal(uv * 2.0, t, blobDynamics, u_bass, u_kick, u_clap, u_vol);
            
            // Asset Type Distinction via Logo Alpha
            float isLogo = col_logo.a;
            float transStrength = mix(u_lava_transformation, u_lava_transformation * 0.6, isLogo);
            
            // Image Abstraction vs Logo Stylization
            if (isLogo > 0.1) {
                // LOGOS: Molten stylization, glowing plastic / liquid acrylic feel
                // Preserve silhouette and key contours
                vec3 moltenCol = col.rgb * (1.2 + u_vol * 0.3);
                col.rgb = mix(col.rgb, moltenCol, transStrength * 0.4);
            } else {
                // PHOTOS: Fluid abstraction, soft posterized masses
                vec3 posterizedCol = floor(col.rgb * 4.0) / 4.0;
                col.rgb = mix(col.rgb, posterizedCol, transStrength * 0.7);
            }
            
            // 3D Shading - Refined for glossy liquid look
            vec3 lightDir = normalize(vec3(1.0, 1.5, 2.5));
            vec3 viewDir = vec3(0.0, 0.0, 1.0);
            float diff = max(dot(normal, lightDir), 0.0);
            
            // Sharper, more glossy specular
            vec3 reflectDir = reflect(-lightDir, normal);
            float spec = pow(max(dot(reflectDir, viewDir), 0.0), 64.0);
            
            // Fresnel effect for edge highlights
            float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 4.0);
            
            // Inner shading / Ambient Occlusion simulation
            float ao = smoothstep(0.0, 0.8, abs(field));
            
            // Surface Detail (Ripples & Flow)
            // Logos get more refined edge shimmer
            float detailScale = mix(15.0, 30.0, isLogo);
            float surfaceDetail = sin(field * detailScale + u_time * 1.5) * 0.03 * (1.0 + u_high);
            field += surfaceDetail;

            // Retro-futuristic 70s space-age energy: Add a subtle "glow" based on field
            // Logos get stronger bloom/glow
            float glowBase = mix(0.4, 0.8, isLogo);
            float glow = smoothstep(0.2, 0.9, abs(field)) * glowBase * (1.0 + u_vol);
            
            // Add halation (warm glow around bright edges)
            float halation = smoothstep(0.6, 1.0, abs(field)) * 0.3 * (1.0 + u_vol);
            vec3 halationColor = vec3(1.0, 0.45, 0.15) * halation;

            if (u_color_mode == 0) { // cosmic-flow
                vec3 color1 = vec3(0.01, 0.03, 0.15); // Deep space blue
                vec3 color2 = vec3(0.05, 0.5, 0.7); // Cyan
                vec3 color3 = vec3(0.35, 0.05, 0.6); // Violet
                
                // Smooth organic blending
                float blend1 = smoothstep(-0.6, 0.4, field + gray * 0.15);
                float blend2 = smoothstep(-0.1, 0.9, field - gray * 0.15);
                
                vec3 mappedColor = mix(color1, color2, blend1);
                mappedColor = mix(mappedColor, color3, blend2);
                
                // Material shading
                mappedColor *= (0.4 + diff * 0.6) * ao;
                mappedColor += vec3(0.8, 0.9, 1.0) * spec * 0.7 * (1.0 + u_high);
                mappedColor += vec3(0.4, 0.6, 1.0) * fresnel * 0.5;
                
                // Subtle glow
                mappedColor += color2 * glow;
                mappedColor += halationColor;
                
                // Final mix with original image to preserve recognizability
                // The mix amount is driven by the transformation cycle
                // Logos preserve recognizability more strongly
                float mixAmount = smoothstep(0.0, 0.7, abs(field)) * transStrength;
                mixAmount *= mix(1.0, 0.7, isLogo);
                
                col.rgb = mix(col.rgb, mappedColor, mixAmount);
            } else if (u_color_mode == 1) { // dual-lava
                vec3 color1 = vec3(0.7, 0.1, 0.0); // Deep Red
                vec3 color2 = vec3(1.0, 0.55, 0.0); // Amber
                
                float midFreq = (u_clap + u_vol) * 0.5;
                
                // Smooth organic blending
                float blend = smoothstep(-0.7, 0.7, field + sin(u_time * 0.4) * 0.15);
                
                vec3 mappedColor = mix(color1, color2, blend);
                
                // Material shading
                mappedColor *= (0.4 + diff * 0.6) * ao;
                mappedColor += vec3(1.0, 0.95, 0.8) * spec * 0.8 * (1.0 + midFreq);
                mappedColor += vec3(1.0, 0.6, 0.2) * fresnel * 0.4;
                
                // Core glow
                mappedColor += color2 * glow * 1.2;
                mappedColor += halationColor * 1.5;
                
                // Final mix with original image
                float mixAmount = smoothstep(0.0, 0.7, abs(field)) * transStrength;
                mixAmount *= mix(1.0, 0.7, isLogo);
                
                col.rgb = mix(col.rgb, mappedColor, mixAmount);
            } else if (u_color_mode == 2) { // spectral-flow
                float highFreq = (u_hat + u_high) * 0.5;
                
                // Cosine palette - more cinematic
                vec3 a = vec3(0.5, 0.5, 0.5);
                vec3 b = vec3(0.5, 0.5, 0.5);
                vec3 c = vec3(0.8, 0.8, 0.8);
                vec3 d = vec3(0.0, 0.33, 0.67);
                
                vec3 mappedColor = a + b * cos(6.28318 * (c * (field * 0.4 + gray * 0.4) + d + u_time * 0.08));
                
                // Material shading
                mappedColor *= (0.5 + diff * 0.5) * ao;
                mappedColor += vec3(1.0) * spec * 0.6 * (1.0 + highFreq);
                mappedColor += mappedColor * fresnel * 0.4;
                
                // Add spectral glow
                mappedColor += mappedColor * glow;
                mappedColor += halationColor;
                
                // Final mix with original image
                float mixAmount = smoothstep(0.0, 0.7, abs(field)) * transStrength;
                mixAmount *= mix(1.0, 0.7, isLogo);
                
                col.rgb = mix(col.rgb, mappedColor, mixAmount);
            }
        }

        // --- Internal Subtle Surface Effects System ---
        // Driven by high frequencies to make the image surface feel alive
        float surfaceActivity = u_high * 0.5 + u_hat * 0.5 + u_buildup * 0.4;
        
        float randVar = rand(uv + fract(u_time * 0.5)); // Small random variation
        
        // 1. Fine Grain
        float fineGrain = (randVar - 0.5) * 0.03 * (0.2 + surfaceActivity);
        col.rgb += fineGrain;
        
        // 2. Micro Flicker
        float microFlicker = (rand(vec2(u_time * 20.0, randVar)) - 0.5) * 0.02 * surfaceActivity;
        col.rgb += microFlicker;
        
        // 3. Thin Horizontal Lines (Micro-VHS)
        float microLines = (sin(uv.y * 1200.0 - u_time * 15.0) * 0.5 + 0.5) * 0.015 * surfaceActivity;
        col.rgb -= microLines;
        
        // 4. Slight Contrast Variation
        col.rgb = mix(vec3(0.5), col.rgb, 1.0 + (surfaceActivity * 0.05));

        // Scanlines
        if (u_enable_vhs > 0.5) {
            float scanline = sin(uv.y * 800.0 + u_time * 5.0) * 0.015 * effect_mult;
            scanline += (rand(uv + u_time) - 0.5) * 0.02 * u_hat * effect_mult;
            col.rgb -= scanline;
        }

        // Noise (affected by high)
        if (u_enable_noise > 0.5) {
            float baseNoise = (rand(uv + u_time) - 0.5) * 0.03 * effect_mult * (1.0 + u_high);
            float extraNoise = (rand(uv + u_time * 2.0) - 0.5) * 0.2 * noiseBurst;
            col.rgb += baseNoise + extraNoise;
        }

        // Flicker (Darker, subtractive)
        if (u_enable_flicker > 0.5) {
            float baseFlicker = sin(u_time * 10.0) * 0.01 * effect_mult * u_flicker_amount;
            col.rgb -= (baseFlicker + abs(flickerBurst) * 0.2 + u_hat * 0.02 * effect_mult * u_flicker_amount);
        }

        // Dark Impact System: Kick adds pressure/compression (darkening and contrast)
        // Remove bright flashes
        float impact = u_kick + u_drop_pulse * 1.5; // Drop pulse hits harder
        col.rgb -= impact * 0.08 * effect_mult; // Slight darkening on kick/drop
        col.rgb = max(vec3(0.0), col.rgb); // Prevent negative colors before contrast
        col.rgb = mix(col.rgb, smoothstep(0.1, 0.9, col.rgb), impact * 0.3 * effect_mult); // Contrast push
        
        // Buildup contrast
        col.rgb = mix(col.rgb, smoothstep(0.05, 0.95, col.rgb), u_buildup * 0.15);

        // Final Logo Blend (Ensure visibility across all modes)
        if (u_visual_mode == 4) {
            col.rgb = mix(col.rgb, col_logo.rgb, col_logo.a * 0.5);
        } else {
            col.rgb = mix(col.rgb, col_logo.rgb, col_logo.a);
        }

        // Vignette
        float dist = distance(vUv, vec2(0.5));
        col.rgb *= smoothstep(0.9, 0.3, dist);

        // Final Safety Fallback: Never allow pure black if assets exist
        if (length(col.rgb) < 0.01 && (u_layer_visibility.x > 0.1 || u_layer_visibility.y > 0.1)) {
            // Fallback to a dimmed version of the poster if everything else failed
            vec2 fallbackUv = getContainUv(originalUv, u_resolution, u_res_poster);
            vec4 fallbackSample = texture2D(u_tex_poster, fallbackUv);
            col.rgb = mix(col.rgb, fallbackSample.rgb * 0.5, fallbackSample.a * u_layer_visibility.y);
        }

        gl_FragColor = vec4(col.rgb, 1.0);
      }
    `);
    gl.compileShader(fs);
    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader compilation failed:', gl.getShaderInfoLog(fs));
    }

    this.program = gl.createProgram()!;
    gl.attachShader(this.program, vs);
    gl.attachShader(this.program, fs);
    gl.linkProgram(this.program);
    gl.useProgram(this.program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1
    ]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(this.program, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    this.uniforms = {
      u_tex_bg: gl.getUniformLocation(this.program, 'u_tex_bg'),
      u_tex_poster: gl.getUniformLocation(this.program, 'u_tex_poster'),
      u_tex_overlay: gl.getUniformLocation(this.program, 'u_tex_overlay'),
      u_tex_logo: gl.getUniformLocation(this.program, 'u_tex_logo'),
      u_tex_flash: gl.getUniformLocation(this.program, 'u_tex_flash'),
      u_time: gl.getUniformLocation(this.program, 'u_time'),
      u_global_effects: gl.getUniformLocation(this.program, 'u_global_effects'),
      u_vol: gl.getUniformLocation(this.program, 'u_vol'),
      u_mid: gl.getUniformLocation(this.program, 'u_mid'),
      u_high: gl.getUniformLocation(this.program, 'u_high'),
      u_low: gl.getUniformLocation(this.program, 'u_low'),
      u_zoom: gl.getUniformLocation(this.program, 'u_zoom'),
      u_last_bg_change: gl.getUniformLocation(this.program, 'u_last_bg_change'),
      u_last_poster_change: gl.getUniformLocation(this.program, 'u_last_poster_change'),
      u_last_overlay_change: gl.getUniformLocation(this.program, 'u_last_overlay_change'),
      u_buildup: gl.getUniformLocation(this.program, 'u_buildup'),
      u_drop_pulse: gl.getUniformLocation(this.program, 'u_drop_pulse'),
      u_resolution: gl.getUniformLocation(this.program, 'u_resolution'),
      u_res_bg: gl.getUniformLocation(this.program, 'u_res_bg'),
      u_res_poster: gl.getUniformLocation(this.program, 'u_res_poster'),
      u_res_overlay: gl.getUniformLocation(this.program, 'u_res_overlay'),
      u_res_logo: gl.getUniformLocation(this.program, 'u_res_logo'),
      u_res_flash: gl.getUniformLocation(this.program, 'u_res_flash'),
      u_visual_mode: gl.getUniformLocation(this.program, 'u_visual_mode'),
      u_color_mode: gl.getUniformLocation(this.program, 'u_color_mode'),
      u_glitch_type: gl.getUniformLocation(this.program, 'u_glitch_type'),
      u_glitch_time: gl.getUniformLocation(this.program, 'u_glitch_time'),
      u_glitch_intensity: gl.getUniformLocation(this.program, 'u_glitch_intensity'),
      u_kick: gl.getUniformLocation(this.program, 'u_kick'),
      u_clap: gl.getUniformLocation(this.program, 'u_clap'),
      u_hat: gl.getUniformLocation(this.program, 'u_hat'),
      u_bass: gl.getUniformLocation(this.program, 'u_bass'),
      u_enable_glitch: gl.getUniformLocation(this.program, 'u_enable_glitch'),
      u_enable_vhs: gl.getUniformLocation(this.program, 'u_enable_vhs'),
      u_enable_curvature: gl.getUniformLocation(this.program, 'u_enable_curvature'),
      u_enable_noise: gl.getUniformLocation(this.program, 'u_enable_noise'),
      u_enable_flicker: gl.getUniformLocation(this.program, 'u_enable_flicker'),
      u_enable_rgb_split: gl.getUniformLocation(this.program, 'u_enable_rgb_split'),
      u_enable_drift_offset: gl.getUniformLocation(this.program, 'u_enable_drift_offset'),
      u_enable_blob_dynamics: gl.getUniformLocation(this.program, 'u_enable_blob_dynamics'),
      u_overlay_enabled: gl.getUniformLocation(this.program, 'u_overlay_enabled'),
      u_overlay_trans_mode: gl.getUniformLocation(this.program, 'u_overlay_trans_mode'),
      u_overlay_opacity: gl.getUniformLocation(this.program, 'u_overlay_opacity'),
      u_flicker_amount: gl.getUniformLocation(this.program, 'u_flicker_amount'),
      u_motion_amount: gl.getUniformLocation(this.program, 'u_motion_amount'),
      u_layer_visibility: gl.getUniformLocation(this.program, 'u_layer_visibility'),
      u_poster_softness: gl.getUniformLocation(this.program, 'u_poster_softness'),
      u_overlay_softness: gl.getUniformLocation(this.program, 'u_overlay_softness'),
      u_poster_white_transparency: gl.getUniformLocation(this.program, 'u_poster_white_transparency'),
      u_overlay_white_transparency: gl.getUniformLocation(this.program, 'u_overlay_white_transparency'),
      u_poster_zoom_weight: gl.getUniformLocation(this.program, 'u_poster_zoom_weight'),
      u_poster_zoom_level: gl.getUniformLocation(this.program, 'u_poster_zoom_level'),
      u_poster_crop: gl.getUniformLocation(this.program, 'u_poster_crop'),
      u_overlay_zoom_weight: gl.getUniformLocation(this.program, 'u_overlay_zoom_weight'),
      u_lava_state: gl.getUniformLocation(this.program, 'u_lava_state'),
      u_lava_next_state: gl.getUniformLocation(this.program, 'u_lava_next_state'),
      u_lava_mix: gl.getUniformLocation(this.program, 'u_lava_mix'),
      u_lava_intensity: gl.getUniformLocation(this.program, 'u_lava_intensity'),
      u_lava_reveal: gl.getUniformLocation(this.program, 'u_lava_reveal'),
      u_lava_transformation: gl.getUniformLocation(this.program, 'u_lava_transformation'),
      u_lava_is_logo: gl.getUniformLocation(this.program, 'u_lava_is_logo'),
      u_represent_pulse: gl.getUniformLocation(this.program, 'u_represent_pulse'),
      u_represent_wave: gl.getUniformLocation(this.program, 'u_represent_wave'),
      u_represent_wave_color: gl.getUniformLocation(this.program, 'u_represent_wave_color'),
      u_beat_phase: gl.getUniformLocation(this.program, 'u_beat_phase'),
      u_bar_phase: gl.getUniformLocation(this.program, 'u_bar_phase'),
      u_energy_trend: gl.getUniformLocation(this.program, 'u_energy_trend'),
    };

    gl.uniform1i(this.uniforms.u_tex_bg, 0);
    gl.uniform1i(this.uniforms.u_tex_poster, 1);
    gl.uniform1i(this.uniforms.u_tex_overlay, 2);
    gl.uniform1i(this.uniforms.u_tex_logo, 3);
    gl.uniform1i(this.uniforms.u_tex_flash, 4);
  }

  setVisualMode(mode: 'signal-glitch' | 'lava-space' | 'represent' | 'contour' | 'kaleidoscope') {
    this.visualMode = mode;
  }

  setColorMode(mode: string) {
    this.colorMode = mode;
  }

  setOptions(opts: Partial<VisualOptions>) {
    this.options = { ...this.options, ...opts };
  }

  updateAssets(assets: AssetItem[]) {
    this.assets = assets;
    this.bgAssets = assets.filter(a => a.metadata.type === 'bg');
    this.posterAssets = assets.filter(a => a.metadata.type === 'poster');
    this.overlayAssets = assets.filter(a => a.metadata.type === 'overlay');
    this.logoAssets = assets.filter(a => a.metadata.type === 'logo');
    this.flashAssets = assets.filter(a => a.metadata.type === 'flash');
    
    if (this.bgAssets.length === 0) this.bgAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.posterAssets.length === 0) this.posterAssets = assets.length > 0 ? assets : [dummyAsset];
    if (this.overlayAssets.length === 0) this.overlayAssets = [dummyAsset];
    if (this.logoAssets.length === 0) this.logoAssets = [dummyAsset];
    if (this.flashAssets.length === 0) this.flashAssets = [dummyAsset];

    // Force a re-pick of assets
    this.bgIndex = Math.floor(Math.random() * this.bgAssets.length);
    this.posterIndex = Math.floor(Math.random() * this.posterAssets.length);
    this.overlayIndex = Math.floor(Math.random() * this.overlayAssets.length);
    this.logoIndex = Math.floor(Math.random() * this.logoAssets.length);
    this.flashIndex = Math.floor(Math.random() * this.flashAssets.length);

    // Clean up unused textures
    const currentImages = new Set(assets.map(a => a.image));
    currentImages.add(dummyAsset.image);
    
    for (const [img, tex] of this.textureCache.entries()) {
      if (!currentImages.has(img)) {
        this.gl?.deleteTexture(tex);
        this.textureCache.delete(img);
      }
    }
  }

  setMacro(macro: 'buildUp' | 'tension' | 'drop' | 'extraBounce', active: boolean) {
    if (macro === 'buildUp') this.macroBuildUp = active;
    if (macro === 'tension') this.macroTension = active;
    if (macro === 'extraBounce') this.macroExtraBounce = active;
    if (macro === 'drop') {
      this.macroDrop = active;
      if (active) {
        // Trigger one-shot drop effects
        this.postDropEnergy = 1.0;
        this.dropPulse = 1.0;
        this.signalGlitchBounce += 1.5;
        this.signalGlitchRecoil += 0.5;
        this.lavaState = (this.lavaState + 1) % 3;
      }
    }
  }

  pickAsset(assets: AssetItem[], vol: number, currentIndex: number): number {
    if (!assets || assets.length === 0) return 0;
    if (assets.length === 1) return 0;
    
    let validAssets = assets.filter((a, i) => {
      if (i === currentIndex) return false; // Don't pick the same one
      if (a.metadata.behavior === 'peak') return vol > 0.8;
      return true;
    });
    if (validAssets.length === 0) validAssets = assets.filter((a, i) => i !== currentIndex);
    if (validAssets.length === 0) return 0; // Fallback if only 1 asset exists

    let totalWeight = 0;
    const weights = validAssets.map(a => {
      let w = 1;
      if (a.metadata.behavior === 'rare') w = 0.1;
      if (a.metadata.behavior === 'frequent') w = 3.0;
      totalWeight += w;
      return w;
    });

    let r = Math.random() * totalWeight;
    for (let i = 0; i < validAssets.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        return assets.indexOf(validAssets[i]);
      }
    }
    return 0;
  }

  private updateLavaSpace(context: MusicalContext) {
    if (!context) return;
    const { events, state, energyTrend, time } = context;
    if (time > this.nextLavaStateTime) {
      this.lavaState = this.lavaNextState;
      this.lavaNextState = Math.floor(Math.random() * 7);
      this.lavaMix = 0;
      this.nextLavaStateTime = time + 6.0 + Math.random() * 8.0; // Slower transitions
    }
    this.lavaMix = Math.min(1.0, this.lavaMix + 0.008);
    
    // Transformation amount driven by state and energy
    let targetTransformation = 0;
    if (state === MusicalState.BUILDING) {
      targetTransformation = 0.4 + energyTrend * 0.4;
    } else if (state === MusicalState.PRE_DROP_TENSION) {
      targetTransformation = 0.8 + Math.sin(time * 10.0) * 0.1;
    } else if (state === MusicalState.DROP_RELEASE) {
      targetTransformation = 1.0;
    } else if (state === MusicalState.GROOVE_LOCKED) {
      targetTransformation = 0.1 + events.rawKick * 0.3;
    }
    
    this.lavaTransformationAmount += (targetTransformation - this.lavaTransformationAmount) * 0.1;

    // Lava intensity reacts to kicks for "impact"
    const targetIntensity = 0.3 + events.rawKick * 0.8 + events.intensity * 0.3;
    this.lavaIntensity += (targetIntensity - this.lavaIntensity) * 0.2;

    // Reveal amount: more abstract during breakdown, more structured during groove
    const targetReveal = state === MusicalState.BREAKDOWN ? 0.3 : 0.85;
    this.lavaReveal += (targetReveal - this.lavaReveal) * 0.05;

    const gl = this.gl;
    if (gl) {
      gl.uniform1f(this.uniforms.u_lava_state, this.lavaState);
      gl.uniform1f(this.uniforms.u_lava_next_state, this.lavaNextState);
      gl.uniform1f(this.uniforms.u_lava_mix, this.lavaMix);
      gl.uniform1f(this.uniforms.u_lava_transformation, this.lavaTransformationAmount);
      gl.uniform1f(this.uniforms.u_lava_intensity, this.lavaIntensity);
      gl.uniform1f(this.uniforms.u_lava_reveal, this.lavaReveal);
      
      // Determine if we are primarily showing a logo in Lava Space
      let lavaIsLogo = 0.0;
      if (this.layerVisibility[3] > 0.5 && this.layerVisibility[1] < 0.2) {
          lavaIsLogo = 1.0;
      }
      gl.uniform1f(this.uniforms.u_lava_is_logo, lavaIsLogo);
    }
  }

  private updateContour(context: MusicalContext) {
    if (!context) return;
    const { events, features, state, time } = context;
    
    // 1. Structural Energy (Global)
    const structuralEnergy = (this.options.globalEffects * 0.5 + events.smoothedBass * 0.5) * this.options.eventDensity;
    
    // 2. Strip Offset (Bass driven)
    const targetStripOffset = events.rawBass * 0.25 * this.options.motionAmount;
    this.contourStripOffset += (targetStripOffset - this.contourStripOffset) * 0.1;
    
    // 3. Plane Shift (Mids driven)
    const targetPlaneShift = this.options.enableCurvature ? (events.rawSnare * 0.4 * this.options.motionAmount) : 0;
    this.contourPlaneShift += (targetPlaneShift - this.contourPlaneShift) * 0.15;
    
    // 4. Reassembly Logic (Phrase boundaries & Energy)
    // Reassemble during breakdown or at phrase boundaries
    let targetReassembly = 1.0;
    if (state === MusicalState.BUILDING || state === MusicalState.DROP_RELEASE) {
      targetReassembly = 0.2 + (1.0 - events.smoothedBass) * 0.5;
    }
    if (events.isPhraseBoundary) {
      targetReassembly = 1.0; // Force reassemble at boundary
    }
    this.contourReassembly += (targetReassembly - this.contourReassembly) * 0.05;
    
    // 5. Bounce & Push (Kick driven)
    const kickBounce = this.options.enableFlicker ? (events.rawKick * 0.5 * this.options.globalEffects) : 0;
    this.contourBounce = Math.max(this.contourBounce * 0.85, kickBounce);
    
    // 6. Shatter (Drop/Peak driven)
    const isDrop = state === MusicalState.DROP_RELEASE;
    const targetShatter = this.options.enableGlitch ? (isDrop ? 1.0 : events.rawSnare * 0.6) : 0;
    this.contourShatter = Math.max(this.contourShatter * 0.9, targetShatter * this.options.globalEffects);
    
    // 7. Raster Density (Highs driven)
    const targetDensity = this.options.enableVHS ? (0.2 + features.high * 1.5 * this.options.eventDensity) : 0;
    this.contourRasterDensity += (targetDensity - this.contourRasterDensity) * 0.1;

    const gl = this.gl;
    if (gl) {
      // u_lava_state -> STRIP COUNT (4 to 24)
      // u_lava_next_state -> REASSEMBLY (0-1)
      // u_lava_mix -> STRIP OFFSET
      // u_lava_intensity -> RELIEF DEPTH
      // u_lava_reveal -> SHATTER
      // u_lava_transformation -> GLOBAL ENERGY
      // u_represent_pulse -> BOUNCE
      // u_represent_wave -> RASTER DENSITY
      // u_represent_wave_color -> PLANE SHIFT
      
      const stripCount = 4.0 + Math.floor(this.options.eventDensity * 20.0);
      
      gl.uniform1f(this.uniforms.u_lava_state, stripCount);
      gl.uniform1f(this.uniforms.u_lava_next_state, this.contourReassembly);
      gl.uniform1f(this.uniforms.u_lava_mix, this.contourStripOffset);
      gl.uniform1f(this.uniforms.u_lava_intensity, this.options.globalEffects);
      gl.uniform1f(this.uniforms.u_lava_reveal, this.contourShatter);
      gl.uniform1f(this.uniforms.u_lava_transformation, structuralEnergy);
      
      gl.uniform1f(this.uniforms.u_represent_pulse, this.contourBounce);
      gl.uniform1f(this.uniforms.u_represent_wave, this.contourRasterDensity);
      gl.uniform1f(this.uniforms.u_represent_wave_color, this.contourPlaneShift);
    }
  }

  private updateRepresent(context: MusicalContext) {
    if (!context) return;
    const { events, state, time, energyTrend } = context;
    
    // Complex pulse: Multi-layered oscillation
    const basePulse = Math.sin(time * 0.5) * 0.2 + Math.sin(time * 1.2) * 0.1;
    const kickPulse = events.rawKick * 0.9;
    
    this.representPulse = Math.max(this.representPulse, kickPulse);
    this.representPulse *= 0.88; // Slightly slower decay
    
    const finalPulse = basePulse + this.representPulse + (state === MusicalState.BUILDING ? energyTrend * 0.3 : 0);
    
    if (time > this.nextRepresentEventTime) {
      this.representWave = 1.0;
      this.representWaveColor = Math.random() > 0.5 ? 1 : 0;
      this.nextRepresentEventTime = time + 5.0 + Math.random() * 5.0;
    }
    this.representWave *= 0.94;

    const gl = this.gl;
    if (gl) {
      gl.uniform1f(this.uniforms.u_represent_pulse, finalPulse);
      gl.uniform1f(this.uniforms.u_represent_wave, this.representWave);
      gl.uniform1f(this.uniforms.u_represent_wave_color, this.representWaveColor);
    }
  }

  private updateSignalGlitch(context: MusicalContext) {
    if (!context) return;
    const { events, state, energyTrend, time, features } = context;
    
    // Post-drop energy window
    if ((state === MusicalState.DROP_RELEASE && context.confidence.drop > 0.8 && this.conductor.shouldTrigger('post_drop_spike', 1.0, 4.0, 2.0)) || this.macroDrop) {
        this.postDropEnergy = 1.0;
    }
    this.postDropEnergy *= 0.98; // Slow decay for a short window
    
    // Post-drop bounce and recoil logic
    const isDrop = state === MusicalState.DROP_RELEASE || this.macroDrop;
    const dropMultiplier = isDrop ? 2.0 : 1.0 + this.postDropEnergy * 1.5;
    
    // Add kick impact to bounce (overshoot and settle)
    if ((events.rawKick > 0.3 && this.conductor.shouldTrigger('signal_bounce', 1.0, 0.05, 0.05)) || this.macroExtraBounce) {
        this.signalGlitchBounce += (events.rawKick || 0.8) * 1.5 * dropMultiplier;
    }
    
    // Add snare/clap impact to recoil
    if ((events.rawSnare > 0.2 && this.conductor.shouldTrigger('signal_recoil', 1.0, 0.05, 0.05)) || this.macroExtraBounce) {
        this.signalGlitchRecoil += (events.rawSnare || 0.8) * 1.8 * dropMultiplier;
    }
    
    // Continuous vibration/shake based on energy
    const vibration = (energyTrend * 0.5 + features.rawVol * 0.5) * this.options.globalEffects;
    this.signalGlitchBounce += (Math.random() - 0.5) * vibration * 0.4;
    this.signalGlitchRecoil += (Math.random() - 0.5) * vibration * 0.4;

    // Elastic settling (spring-like decay)
    this.signalGlitchBounce += (0 - this.signalGlitchBounce) * 0.15;
    this.signalGlitchRecoil += (0 - this.signalGlitchRecoil) * 0.2;
    
    this.signalGlitchBounce *= 0.95;
    this.signalGlitchRecoil *= 0.92;

    // State-aware glitching
    let triggerChance = 0.7; // 30% base chance
    if (state === MusicalState.BUILDING) triggerChance = 0.5;
    if (state === MusicalState.PRE_DROP_TENSION) triggerChance = 0.3;
    
    let triggerThreshold = 0.2 - this.postDropEnergy * 0.1; // Lowered threshold for more action
    if (events.beatAccent === 3) triggerThreshold = 0.05; // 16th beat accent
    else if (events.beatAccent === 2) triggerThreshold = 0.1; // 8th beat accent
    else if (events.beatAccent === 1) triggerThreshold = 0.15; // 4th beat accent

    const densityMult = Math.max(0.05, 1.0 - this.options.eventDensity); // More aggressive density
    if (features.rawVol > triggerThreshold && this.conductor.shouldTrigger('glitch', triggerChance, 0.1 * densityMult, 0.1 * densityMult)) {
      this.glitchIntensity = 2.0 + Math.random() * 1.5 + this.postDropEnergy * 1.0; // Massive intensity
      if (events.beatAccent >= 2) this.glitchIntensity += 1.0;
      this.glitchType = Math.floor(Math.random() * 9); // Use all 9 glitch types
      if (state === MusicalState.PRE_DROP_TENSION) this.glitchType = 7; // More aggressive glitch
      if (events.beatAccent === 3) this.glitchType = 6; // Special glitch on 16th
      this.glitchDuration = 0.2 + Math.random() * 0.4;
      this.glitchTime = time;
    }
    
    this.glitchIntensity *= 0.85; // Slightly slower decay for more presence

    const gl = this.gl;
    if (gl) {
      gl.uniform1f(this.uniforms.u_glitch_intensity, this.glitchIntensity);
      gl.uniform1i(this.uniforms.u_glitch_type, this.glitchType);
      
      // Pass bounce and recoil to shader using existing uniforms
      gl.uniform1f(this.uniforms.u_represent_pulse, this.signalGlitchBounce);
      gl.uniform1f(this.uniforms.u_represent_wave, this.signalGlitchRecoil);
    }
  }

  private updateKaleidoscope(context: MusicalContext) {
    if (!context) return;
    const { events, features, time } = context;

    // 1. Rotation: Repaired curve - much slower, power-based scaling
    // 0.5 is neutral, extremes are faster but still elegant
    const motion = this.options.motionAmount;
    const curve = Math.pow(Math.abs(motion - 0.5) * 2.0, 3.0) * Math.sign(motion - 0.5);
    const baseRotationSpeed = curve * 0.015; // Max ~0.9 rad/s at extremes
    const organicRotation = Math.sin(time * 0.1) * 0.005;
    const bassRotation = events.rawBass * 0.01 * motion;
    this.kaleidoscopeRotation += (baseRotationSpeed + organicRotation + bassRotation);

    // 2. Pattern Drift: Slow offset movement (parallax feel)
    const driftSpeed = this.options.transitionSpeed * 0.02;
    this.kaleidoscopeDrift.x += Math.sin(time * 0.15) * driftSpeed;
    this.kaleidoscopeDrift.y += Math.cos(time * 0.12) * driftSpeed;

    // 3. Center Pulse & Tunnel Depth
    // Kick drives the "expansion" from center
    const kickPulse = events.rawKick * 0.4 * this.options.globalEffects;
    this.kaleidoscopeCenterPulse = Math.max(this.kaleidoscopeCenterPulse * 0.9, kickPulse);
    
    // Tunnel depth: continuous movement + bass pressure
    const tunnelSpeed = (this.options.transitionSpeed - 0.5) * 0.05;
    this.kaleidoscopeTunnelDepth += tunnelSpeed + events.rawBass * 0.03;

    // 4. Shape Morphing (Mids + Shimmer)
    // Shapes morph from oval to angular based on mids and flicker (shimmer)
    const targetMorph = (features.mid * 0.5 + features.high * 0.5 * this.options.flickerAmount) * this.options.eventDensity;
    this.kaleidoscopeShapeMorph = this.kaleidoscopeShapeMorph * 0.95 + targetMorph * 0.05;

    // 5. Shape Type Evolution
    // Change shape family occasionally or based on phrase boundaries
    if (events.isPhraseBoundary || (Math.random() < 0.002 * this.options.eventDensity)) {
      this.kaleidoscopeShapeType = (this.kaleidoscopeShapeType + 1) % 4;
    }

    const gl = this.gl;
    if (gl) {
      // Reusing lava uniforms for kaleidoscope
      // u_lava_state -> SIDES (4 to 16)
      // u_lava_next_state -> SHAPE TYPE (0-3)
      // u_lava_mix -> SHAPE MORPH (0-1)
      // u_lava_intensity -> MIRROR DEPTH / SYMMETRY
      // u_lava_reveal -> TUNNEL DEPTH (continuous)
      // u_lava_transformation -> ROTATION (continuous)
      // u_lava_is_logo -> CENTER LOCK (0 or 1)
      
      const sides = 4.0 + Math.floor(this.options.eventDensity * 12.0);
      const shimmer = features.high * this.options.flickerAmount;
      
      gl.uniform1f(this.uniforms.u_lava_state, sides);
      gl.uniform1f(this.uniforms.u_lava_next_state, this.kaleidoscopeShapeType);
      gl.uniform1f(this.uniforms.u_lava_mix, this.kaleidoscopeShapeMorph);
      gl.uniform1f(this.uniforms.u_lava_intensity, this.options.globalEffects);
      gl.uniform1f(this.uniforms.u_lava_reveal, this.kaleidoscopeTunnelDepth);
      gl.uniform1f(this.uniforms.u_lava_transformation, this.kaleidoscopeRotation);
      gl.uniform1f(this.uniforms.u_lava_is_logo, this.options.enableCurvature ? 1.0 : 0.0);
      
      // Use represent uniforms for additional params
      gl.uniform1f(this.uniforms.u_represent_pulse, this.kaleidoscopeCenterPulse);
      gl.uniform1f(this.uniforms.u_represent_wave, shimmer);
      
      // We can use u_poster_crop for drift
      gl.uniform2f(this.uniforms.u_poster_crop, this.kaleidoscopeDrift.x, this.kaleidoscopeDrift.y);
    }
  }

  render = () => {
    if (!this.running) return;
    requestAnimationFrame(this.render);

    const now = performance.now();
    const dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    this.time += dt;

    let context: MusicalContext | null = null;
    if (this.audioAnalyzer) {
      const features = this.audioAnalyzer.getSignalFeatures(this.time);
      context = this.conductor.update(features, this.time);
      this.lastMusicalContext = context;
    }

    const vol = context?.features.vol || 0;
    const low = context?.features.low || 0;
    const mid = context?.features.mid || 0;
    const high = context?.features.high || 0;
    const kick = context?.events.rawKick || 0;
    const bass = context?.events.smoothedBass || 0;
    const snare = context?.events.rawSnare || 0;
    const hat = context?.events.rawHat || 0;
    let buildup = context?.confidence.build || 0;
    let drop = context?.confidence.drop || 0;
    
    // Apply macros
    if (this.macroBuildUp) buildup = Math.max(buildup, 0.8);
    if (this.macroTension) {
      this.glitchIntensity = Math.max(this.glitchIntensity, 0.6);
      this.glitchType = 1; // Horizontal tearing
    }
    
    // Decay drop pulse if triggered manually
    if (this.dropPulse > 0) {
      drop = Math.max(drop, this.dropPulse);
      this.dropPulse *= 0.9;
      if (this.dropPulse < 0.01) this.dropPulse = 0;
    }

    const beatPhase = context?.beatPhase || 0;
    const barPhase = context?.barPhase || 0;
    const energyTrend = context?.energyTrend || 0;

    // Update uniforms
    const gl = this.gl;
    if (!gl) return;

    // Temporary Debug Logging
    if (Math.floor(this.time * 2) % 20 === 0 && Math.random() < 0.05) { // Log occasionally
      console.log('VIZR Render State:', {
        mode: this.visualMode,
        assets: {
          bg: this.bgAssets.length,
          poster: this.posterAssets.length,
          overlay: this.overlayAssets.length,
          logo: this.logoAssets.length
        },
        visibility: this.layerVisibility,
        glitch: this.glitchIntensity > 0 ? this.glitchType : 'none'
      });
    }

    gl.uniform1f(this.uniforms.u_vol, vol);
    gl.uniform1f(this.uniforms.u_low, low);
    gl.uniform1f(this.uniforms.u_mid, mid);
    gl.uniform1f(this.uniforms.u_high, high);
    gl.uniform1f(this.uniforms.u_kick, kick);
    gl.uniform1f(this.uniforms.u_clap, snare);
    gl.uniform1f(this.uniforms.u_bass, bass);
    gl.uniform1f(this.uniforms.u_hat, hat);
    gl.uniform1f(this.uniforms.u_buildup, buildup);
    gl.uniform1f(this.uniforms.u_drop_pulse, drop);
    gl.uniform1f(this.uniforms.u_beat_phase, beatPhase);
    gl.uniform1f(this.uniforms.u_bar_phase, barPhase);
    gl.uniform1f(this.uniforms.u_energy_trend, energyTrend);

    // Mode-Specific Logic
    if (this.visualMode === 'lava-space') {
      this.updateLavaSpace(context!);
    } else if (this.visualMode === 'contour') {
      this.updateContour(context!);
    } else if (this.visualMode === 'represent') {
      this.updateRepresent(context!);
    } else if (this.visualMode === 'signal-glitch') {
      this.updateSignalGlitch(context!);
    } else if (this.visualMode === 'kaleidoscope') {
      this.updateKaleidoscope(context!);
    }
    // --- Asset Switching & Glitch Logic ---
    if (context) {
      const { events, features, state } = context;
      
      const densityMult = Math.max(0.1, 1.5 - this.options.eventDensity);
      // Phrase Boundary or High Intensity Kick triggers asset switch
      if (events.isPhraseBoundary || (events.rawKick > 0.85 && this.conductor.shouldTrigger('asset_switch', 0.8, 0.5 * densityMult, 0.5 * densityMult))) {
        const speedMult = Math.max(0.1, 2.0 - this.options.transitionSpeed * 1.9);
        
        if (Math.random() > 0.4 && this.time - this.lastBgChange > 2.0 * speedMult) {
          this.bgIndex = this.pickAsset(this.bgAssets, features.vol, this.bgIndex);
          this.lastBgChange = this.time;
          this.updateTextures('bg');
        }
        
        if (Math.random() > 0.5 && this.time - this.lastPosterChange > 1.5 * speedMult) {
          this.posterIndex = this.pickAsset(this.posterAssets, features.vol, this.posterIndex);
          this.lastPosterChange = this.time;
          
          // Randomize poster zoom and crop for variety
          if (Math.random() > 0.5) {
            this.posterZoomLevel = 1.0 + Math.random() * 2.0;
            this.posterCrop = { x: (Math.random() - 0.5) * 0.5, y: (Math.random() - 0.5) * 0.5 };
          } else {
            this.posterZoomLevel = 1.0;
            this.posterCrop = { x: 0, y: 0 };
          }
          this.updateTextures('poster');
        }

        if (Math.random() > 0.3 && this.time - this.lastOverlayChange > 0.5 * speedMult) {
          this.overlayIndex = this.pickAsset(this.overlayAssets, features.vol, this.overlayIndex);
          this.logoIndex = this.pickAsset(this.logoAssets, features.vol, this.logoIndex);
          this.flashIndex = this.pickAsset(this.flashAssets, features.vol, this.flashIndex);
          this.lastOverlayChange = this.time;
          this.updateTextures('overlay');
          this.updateTextures('logo');
          this.updateTextures('flash');
        }
      }

      // Glitch Logic (Mode-aware)
      if (this.options.enableGlitch) {
        if (state === MusicalState.BUILDING || state === MusicalState.PRE_DROP_TENSION) {
          // Increase glitch probability during building/tension
          if (this.conductor.shouldTrigger('glitch_tension', 0.4, 0.4 * densityMult, 0.2 * densityMult)) {
            this.glitchIntensity = 0.5 + Math.random() * 0.5;
            this.glitchType = Math.floor(Math.random() * 8) + 1;
            this.glitchDuration = 0.1;
            this.glitchTime = this.time;
          }
        }
      }
    }

    // Start State Check
    if (this.prevPosterIndex !== this.posterIndex) {
        this.prevPosterIndex = this.posterIndex;
        if (Math.random() > 0.4) {
            this.currentZoom = 0.15 + Math.random() * 0.1;
            this.targetZoom = 0;
            this.zoomState = 'DRIFT';
        }
    }

    // Musical Zoom Logic
    if (kick > 0.6 && this.time - this.lastKick > 0.3) {
        this.lastKick = this.time;
        this.beatCount++;
        
        const beat = this.beatCount % 4;
        let pulse = 0;
        
        if (beat === 1) {
            pulse = 0.02 + Math.random() * 0.02;
        } else if (beat === 0) {
            pulse = 0.05 + Math.random() * 0.04;
        }
        
        const densityMult = Math.max(0.1, 1.5 - this.options.eventDensity);
        if (pulse > 0 && this.conductor.shouldTrigger('zoom_pulse', 0.6, 0.5 * densityMult, 0.2 * densityMult)) {
            this.targetZoom += pulse;
            this.zoomState = 'PULSE';
            this.pulseTimer = 0.1;
        }
    }
    
    this.pulseTimer -= dt;
    if (this.pulseTimer <= 0 && this.zoomState === 'PULSE') {
        this.zoomState = 'DRIFT';
    }

    // Cap target zoom to avoid extreme zoom-ins
    this.targetZoom = Math.min(this.targetZoom, 0.2);
    
    if (this.zoomState === 'DRIFT') {
        this.targetZoom = Math.max(0, this.targetZoom - 0.03 * dt); // Very slow zoom out
    }
    
    // Smooth interpolation
    this.currentZoom += (this.targetZoom - this.currentZoom) * 6.0 * dt;

    gl.useProgram(this.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.bgAssets[this.bgIndex].image));
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.posterAssets[this.posterIndex].image));
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.overlayAssets[this.overlayIndex].image));
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.logoAssets[this.logoIndex].image));
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, this.getTexture(this.flashAssets[this.flashIndex].image));

    gl.uniform1f(this.uniforms.u_time, this.time);
    gl.uniform1f(this.uniforms.u_global_effects, this.options.globalEffects);
    gl.uniform1f(this.uniforms.u_last_bg_change, this.lastBgChange);
    gl.uniform1f(this.uniforms.u_last_poster_change, this.lastPosterChange);
    gl.uniform1f(this.uniforms.u_last_overlay_change, this.lastOverlayChange);
    gl.uniform1f(this.uniforms.u_zoom, this.currentZoom + buildup * 0.05);
    
    let visualModeInt = 0;
    if (this.visualMode === 'lava-space') visualModeInt = 1;
    else if (this.visualMode === 'represent') visualModeInt = 2;
    else if (this.visualMode === 'contour') visualModeInt = 3;
    else if (this.visualMode === 'kaleidoscope') visualModeInt = 4;
    gl.uniform1i(this.uniforms.u_visual_mode, visualModeInt);

    let colorModeInt = 0;
    if (this.visualMode === 'signal-glitch') {
      if (this.colorMode === 'mono-accent') colorModeInt = 1;
      else if (this.colorMode === 'mixed') colorModeInt = 2;
      else if (this.colorMode === 'spectral-rgb') colorModeInt = 3;
    } else if (this.visualMode === 'lava-space') {
      if (this.colorMode === 'dual-lava') colorModeInt = 1;
      else if (this.colorMode === 'spectral-flow') colorModeInt = 2;
    }
    gl.uniform1i(this.uniforms.u_color_mode, colorModeInt);

    gl.uniform1f(this.uniforms.u_enable_glitch, this.options.enableGlitch ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_vhs, this.options.enableVHS ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_curvature, this.options.enableCurvature ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_noise, this.options.enableNoise ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_flicker, this.options.enableFlicker ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_rgb_split, this.options.enableRGBSplit ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_drift_offset, this.options.enableDriftOffset ? 1.0 : 0.0);
    gl.uniform1f(this.uniforms.u_enable_blob_dynamics, this.options.enableBlobDynamics ? 1.0 : 0.0);
    
    gl.uniform1f(this.uniforms.u_overlay_enabled, this.options.overlayEnabled ? 1.0 : 0.0);
    let transMode = 0.0;
    if (this.options.overlayTransparencyMode === 'black') transMode = 1.0;
    else if (this.options.overlayTransparencyMode === 'white') transMode = 2.0;
    gl.uniform1f(this.uniforms.u_overlay_trans_mode, transMode);
    gl.uniform1f(this.uniforms.u_overlay_opacity, this.options.overlayOpacity / 100.0);
    
    gl.uniform1f(this.uniforms.u_flicker_amount, this.options.flickerAmount);
    gl.uniform1f(this.uniforms.u_motion_amount, this.options.motionAmount);
    gl.uniform4f(this.uniforms.u_layer_visibility, this.layerVisibility[0], this.layerVisibility[1], this.layerVisibility[2], this.layerVisibility[3]);

    gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
    
    const bgImg = this.bgAssets[this.bgIndex].image;
    gl.uniform2f(this.uniforms.u_res_bg, bgImg.width, bgImg.height);
    
    const posterAsset = this.posterAssets[this.posterIndex];
    gl.uniform2f(this.uniforms.u_res_poster, posterAsset.image.width, posterAsset.image.height);
    let posterSoftness = 0.0;
    let posterWhiteTransp = 0.0;
    let posterZoomWeight = 0.0;
    if (posterAsset.metadata.type === 'poster') {
      posterSoftness = posterAsset.metadata.aspect === 'portrait' ? 0.2 : 0.1;
      posterWhiteTransp = posterAsset.metadata.color === 'mono' ? 0.5 : 0.2;
      posterZoomWeight = posterAsset.metadata.behavior === 'peak' ? 1.5 : 1.0;
    }
    gl.uniform1f(this.uniforms.u_poster_softness, posterSoftness);
    gl.uniform1f(this.uniforms.u_poster_white_transparency, posterWhiteTransp);
    gl.uniform1f(this.uniforms.u_poster_zoom_weight, posterZoomWeight);
    gl.uniform1f(this.uniforms.u_poster_zoom_level, this.posterZoomLevel);
    gl.uniform2f(this.uniforms.u_poster_crop, this.posterCrop.x, this.posterCrop.y);
    
    const overlayAsset = this.overlayAssets[this.overlayIndex];
    gl.uniform2f(this.uniforms.u_res_overlay, overlayAsset.image.width, overlayAsset.image.height);
    let overlaySoftness = 0.0;
    let overlayWhiteTransp = 0.0;
    let overlayZoomWeight = 0.0;
    if (overlayAsset.metadata.type === 'overlay') {
      overlaySoftness = overlayAsset.metadata.aspect === 'square' ? 0.4 : 0.2;
      overlayWhiteTransp = overlayAsset.metadata.color === 'accent' ? 0.9 : 0.7;
      overlayZoomWeight = overlayAsset.metadata.behavior === 'rare' ? 0.2 : 0.5;
    }
    gl.uniform1f(this.uniforms.u_overlay_softness, overlaySoftness);
    gl.uniform1f(this.uniforms.u_overlay_white_transparency, overlayWhiteTransp);
    gl.uniform1f(this.uniforms.u_overlay_zoom_weight, overlayZoomWeight);

    const logoAsset = this.logoAssets[this.logoIndex];
    gl.uniform2f(this.uniforms.u_res_logo, logoAsset.image.width, logoAsset.image.height);

    const flashAsset = this.flashAssets[this.flashIndex];
    gl.uniform2f(this.uniforms.u_res_flash, flashAsset.image.width, flashAsset.image.height);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this.resize);
    if (this.audioAnalyzer) {
      this.audioAnalyzer.stop();
    }
    const gl = this.gl;
    if (gl) {
      this.textureCache.forEach(tex => gl.deleteTexture(tex));
      this.textureCache.clear();
      if (this.program) gl.deleteProgram(this.program);
    }
  }
}
