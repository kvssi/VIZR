import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, MicOff, Play, Pause, Square, Maximize, Image as ImageIcon, X, MonitorUp, FileAudio, Smartphone, Dices, Zap, RefreshCw, Info, Wifi, Activity, Trash2, Plus } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { MusicalContext, ControlState, ToggleState, defaultControlState, defaultToggleState } from './types';
import { AudioAnalyzer } from './engine/AudioAnalyzer';
import { VisualEngine, VisualOptions } from './engine/VisualEngine';
import type { AssetType, AssetAspect, AssetColor, AssetBehavior, ImageMetadata, AssetItem } from './assets/assetTypes';
import { AssetEditor, parseMetadata } from './assets/AssetEditor';

import { ToggleSwitch } from './ui/ToggleSwitch';
import { ContactModal, ImpressumModal, AboutModal, FaqModal, RemoteModal, AssetInfoModal } from './ui/Modals';
import { RemoteControl } from './ui/RemoteControl/RemoteControl';
import { SetupView } from './ui/SetupView';
import { LiveControls } from './ui/LiveControls';

const APP_VERSION = "3.0.0-beta";




export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const remoteRoomId = urlParams.get('remote');

  if (remoteRoomId) {
    return <RemoteControl roomId={remoteRoomId} />;
  }

  const [roomId] = useState(() => {
    const saved = localStorage.getItem('vizr_room_id');
    if (saved) return saved;
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('vizr_room_id', newId);
    return newId;
  });
  const [showRemoteModal, setShowRemoteModal] = useState(false);
  const [showAssetInfoModal, setShowAssetInfoModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showImpressumModal, setShowImpressumModal] = useState(false);
  const [view, setView] = useState<'visualizer' | 'editor'>('visualizer');
  const socketRef = useRef<Socket | null>(null);

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [audioMode, setAudioMode] = useState<'mic' | 'ambient' | 'screen' | 'file'>('ambient');
  const [audioFile, setAudioFile] = useState<File | undefined>();
  const [deviceId, setDeviceId] = useState<string>();
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioError, setAudioError] = useState<string | null>(null);
  
  const [controlState, setControlState] = useState<ControlState>(defaultControlState);

  const { visualMode, colorMode } = controlState;
  const activeToggles = controlState.toggles[visualMode] ?? defaultToggleState;

  const {
    enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit, enableDriftOffset, enableBlobDynamics
  } = activeToggles;
  
  const {
    globalEffects, flickerAmount, motionAmount, eventDensity, transitionSpeed
  } = controlState.sliders;
  
  const overlaySettings = controlState.overlaySettings;

  const setVisualMode = (mode: ControlState['visualMode']) => {
    setControlState(prev => ({ ...prev, visualMode: mode }));
  };

  const setColorMode = (mode: string) => {
    setControlState(prev => ({ ...prev, colorMode: mode }));
  };

  const updateToggle = (key: keyof ToggleState) => (val: any) => {
    setControlState(prev => ({
      ...prev,
      toggles: {
        ...prev.toggles,
        [prev.visualMode]: {
          ...(prev.toggles[prev.visualMode] ?? defaultToggleState),
          [key]: typeof val === 'function'
            ? val((prev.toggles[prev.visualMode] ?? defaultToggleState)[key])
            : val
        }
      }
    }));
  };

  const updateSlider = (key: keyof ControlState['sliders']) => (val: any) => {
    setControlState(prev => ({
      ...prev,
      sliders: { ...prev.sliders, [key]: typeof val === 'function' ? val(prev.sliders[key]) : val }
    }));
  };

  const setEnableGlitch = updateToggle('enableGlitch');
  const setEnableVHS = updateToggle('enableVHS');
  const setEnableCurvature = updateToggle('enableCurvature');
  const setEnableNoise = updateToggle('enableNoise');
  const setEnableFlicker = updateToggle('enableFlicker');
  const setEnableRGBSplit = updateToggle('enableRGBSplit');
  const setEnableDriftOffset = updateToggle('enableDriftOffset');
  const setEnableBlobDynamics = updateToggle('enableBlobDynamics');

  const setGlobalEffects = updateSlider('globalEffects');
  const setFlickerAmount = updateSlider('flickerAmount');
  const setMotionAmount = updateSlider('motionAmount');
  const setEventDensity = updateSlider('eventDensity');
  const setTransitionSpeed = updateSlider('transitionSpeed');

  const setOverlaySettings = (val: any) => {
    setControlState(prev => ({
      ...prev,
      overlaySettings: typeof val === 'function' ? val(prev.overlaySettings) : val
    }));
  };

  const [isPlaying, setIsPlaying] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const [remoteState, setRemoteState] = useState<'OFFLINE' | 'WAITING' | 'CONNECTED'>('OFFLINE');
  const [filePlaying, setFilePlaying] = useState(true);
  const [fileVolume, setFileVolume] = useState(1.0);
  const [showUI, setShowUI] = useState(false);
  const [livePage, setLivePage] = useState<'controls' | 'overlay' | 'performance'>('controls');
  const [showHint, setShowHint] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<VisualEngine | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.enumerateDevices !== 'function') {
      console.warn("enumerateDevices is not supported in this context.");
      return;
    }
    navigator.mediaDevices.enumerateDevices().then(devices => {
      const audioInputs = devices.filter(d => d.kind === 'audioinput');
      setDevices(audioInputs);
      if (audioInputs.length > 0 && !deviceId) {
        setDeviceId(audioInputs[0].deviceId);
      }
    }).catch(err => {
      console.error("Error enumerating devices", err);
    });
  }, []);

  useEffect(() => {
    if (audioMode !== 'mic' || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      return;
    }

    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(track => track.stop());
        return navigator.mediaDevices.enumerateDevices();
      })
      .then(allDevices => {
        if (cancelled) return;
        const audioInputs = allDevices.filter(device => device.kind === 'audioinput');
        setDevices(audioInputs);
        if (audioInputs.length > 0 && (!deviceId || !audioInputs.some(device => device.deviceId === deviceId))) {
          setDeviceId(audioInputs[0].deviceId);
        }
      })
      .catch(err => {
        console.warn("Unable to refresh microphone devices after permission request", err);
      });

    return () => {
      cancelled = true;
    };
  }, [audioMode, deviceId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter((f: File) => f.type.startsWith('image/'));
    const loadedAssets: AssetItem[] = [];
    let loadedCount = 0;

    files.forEach((file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const metadata = parseMetadata(file, img);
        loadedAssets.push({ image: img, metadata, file });
        loadedCount++;
        if (loadedCount === files.length) {
          setAssets(prev => [...prev, ...loadedAssets]);
        }
      };
      img.src = url;
    });
  };

  const handleAudioFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setAudioError(null);
    setAudioFile(selectedFile);
    setAudioMode('file');
    setFilePlaying(true);
    setFileVolume(1.0);
  };

  const handleShuffle = () => {
    console.log("[VIZR] Shuffle triggered. Regenerating scene...");
    setAssets(prev => {
      if (prev.length === 0) return prev;
      return [...prev].sort(() => Math.random() - 0.5);
    });
  };

  const handleRandomize = () => {
    setMotionAmount(Math.random());
    setGlobalEffects(Math.random());
    setEventDensity(Math.random());
    setFlickerAmount(Math.random());
    setTransitionSpeed(Math.random());
    setEnableGlitch(Math.random() > 0.3);
    setEnableVHS(Math.random() > 0.3);
    setEnableRGBSplit(Math.random() > 0.3);
  };

  const handleReset = () => {
    setControlState({
      ...defaultControlState,
      visualMode: controlState.visualMode, // Preserve current mode
      colorMode: controlState.colorMode
    });
  };

  const handleStart = () => {
    if (assets.length === 0) return;
    setIsPlaying(true);
  };

  const stateRef = useRef(controlState);

  useEffect(() => {
    stateRef.current = controlState;
    if (socketRef.current) {
      socketRef.current.emit('FULL_CONTROL_STATE', roomId, controlState);
    }
  }, [controlState, roomId]);

  useEffect(() => {
    if (isPlaying && !showUI) {
      setShowHint(true);
      const timer = setTimeout(() => setShowHint(false), 2500);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [isPlaying, showUI]);

  useEffect(() => {
    const socket = io();
    socketRef.current = socket;
    socket.emit('join-room', roomId, 'host');
    setRemoteState('WAITING');

    socket.on('remote-connected', () => {
      setRemoteState('CONNECTED');
      if (!isPlaying) {
        setIsPlaying(true);
      }
    });

    socket.on('remote-disconnected', () => {
      setRemoteState('WAITING');
    });

    socket.on('REQUEST_CONTROL_STATE', () => {
      setRemoteState('CONNECTED');
      if (!isPlaying) {
        setIsPlaying(true);
      }
      socket.emit('FULL_CONTROL_STATE', roomId, stateRef.current);
    });

    socket.on('command', (cmd) => {
      if (cmd.action === 'visualMode') setVisualMode(cmd.value);
      if (cmd.action === 'colorMode') setColorMode(cmd.value);
      if (cmd.action === 'speed') setMotionAmount(cmd.value);
      if (cmd.action === 'intensity') setGlobalEffects(cmd.value);
      if (cmd.action === 'complexity') setEventDensity(cmd.value);
      if (cmd.action === 'glitch') setFlickerAmount(cmd.value);
      if (cmd.action === 'transitionSpeed') setTransitionSpeed(cmd.value);
      if (cmd.action === 'enableGlitch') setEnableGlitch(cmd.value);
      if (cmd.action === 'enableVHS') setEnableVHS(cmd.value);
      if (cmd.action === 'enableCurvature') setEnableCurvature(cmd.value);
      if (cmd.action === 'enableNoise') setEnableNoise(cmd.value);
      if (cmd.action === 'enableFlicker') setEnableFlicker(cmd.value);
      if (cmd.action === 'enableRGBSplit') setEnableRGBSplit(cmd.value);
      if (cmd.action === 'enableDriftOffset') setEnableDriftOffset(cmd.value);
      if (cmd.action === 'enableBlobDynamics') setEnableBlobDynamics(cmd.value);
      if (cmd.action === 'overlaySettings') setOverlaySettings(cmd.value);
      if (cmd.action === 'reset') handleReset();
      if (cmd.action === 'macro') {
        if (engineRef.current) {
          engineRef.current.setMacro(cmd.value.name, cmd.value.active);
        }
      }
      if (cmd.action === 'shuffle') {
        console.log("[VIZR] Remote shuffle received by host.");
        handleShuffle();
      }
      if (cmd.action === 'randomize') {
        handleRandomize();
      }
    });

    socket.on('new-image', async (payload) => {
      try {
        const res = await fetch(payload.data);
        const blob = await res.blob();
        const file = new File([blob], payload.name, { type: payload.type });
        
        const img = new Image();
        img.onload = () => {
          const metadata = parseMetadata(file, img);
          setAssets(prev => [...prev, { image: img, metadata, file }]);
        };
        img.src = URL.createObjectURL(file);
      } catch (err) {
        console.error("Failed to process remote image", err);
      }
    });

    return () => { socket.disconnect(); };
  }, [roomId]);

  useEffect(() => {
    if (isPlaying) {
      // Trigger fade-in when playing starts
      const timer = setTimeout(() => setFadeOpacity(1), 50);
      return () => clearTimeout(timer);
    } else {
      setFadeOpacity(0);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying && canvasRef.current && !engineRef.current) {
      setAudioError(null);
      engineRef.current = new VisualEngine(
        canvasRef.current, 
        assets, 
        audioMode, 
        deviceId, 
        audioFile,
        visualMode,
        colorMode,
        (err) => {
          setAudioError(err.message || "Audio access denied");
          handleStop();
        }
      );
    }
  }, [isPlaying, audioMode, deviceId, audioFile, visualMode]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateAssets(assets);
    }
  }, [assets]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVisualMode(visualMode);
    }
  }, [visualMode]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setColorMode(colorMode);
    }
  }, [colorMode]);

  const handleStop = () => {
    setIsPlaying(false);
    setShowUI(false);
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    const elem = document as any;
    if (document.fullscreenElement || elem.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (elem.webkitExitFullscreen) {
        elem.webkitExitFullscreen();
      }
    }
  };

  const toggleFullscreen = () => {
    const elem = document.documentElement as any;
    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen().catch((err: any) => console.error(err));
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err: any) => console.error(err));
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
    }
  };

  useEffect(() => {
    if (engineRef.current) {
      const currentOverlaySettings = overlaySettings[visualMode] || { enabled: true, mode: 'normal', opacity: 100 };
      engineRef.current.setOptions({
        enableGlitch,
        enableVHS,
        enableCurvature,
        enableNoise,
        enableFlicker,
        enableRGBSplit,
        enableDriftOffset,
        enableBlobDynamics,
        overlayEnabled: currentOverlaySettings.enabled,
        overlayTransparencyMode: currentOverlaySettings.mode,
        overlayOpacity: currentOverlaySettings.opacity,
        globalEffects,
        flickerAmount,
        motionAmount,
        eventDensity,
        transitionSpeed
      });
    }
  }, [enableGlitch, enableVHS, enableCurvature, enableNoise, enableFlicker, enableRGBSplit, enableDriftOffset, enableBlobDynamics, overlaySettings, visualMode, globalEffects, flickerAmount, motionAmount, eventDensity, transitionSpeed]);

  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  if (view === 'editor') {
    return (
      <AssetEditor 
        assets={assets} 
        onAssetsChange={setAssets} 
        onAddMore={() => fileInputRef.current?.click()}
        onClose={() => setView('visualizer')} 
      />
    );
  }

  if (isPlaying) {
    return (
      <div 
        className="fixed inset-0 bg-vizr-onyx overflow-hidden transition-opacity duration-700 ease-in-out" 
        style={{ opacity: fadeOpacity }}
        onClick={() => setShowUI(!showUI)}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
        
        {/* Hint Text */}
        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${showHint ? 'opacity-100' : 'opacity-0'}`}>
          <div className="bg-vizr-onyx/60 backdrop-blur-md text-vizr-signal/60 px-6 py-2.5 border border-vizr-signal/20 rounded-xs text-[10px] tracking-[0.3em] font-black uppercase animate-pulse shadow-2xl">
            Tap anywhere for controls
          </div>
        </div>

        {/* Remote Connection Indicator */}
        <div className={`absolute top-8 left-8 transition-opacity duration-300 ${showUI ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`flex items-center gap-2.5 px-4 py-2 rounded-xs text-[10px] font-black tracking-[0.2em] uppercase border ${remoteState === 'CONNECTED' ? 'bg-vizr-signal/10 border-vizr-signal/40 text-vizr-signal shadow-[0_0_15px_rgba(224,82,156,0.2)]' : 'bg-vizr-surface/50 border-white/5 text-neutral-600'}`}>
            <Activity size={14} className={remoteState === 'CONNECTED' ? 'animate-pulse' : ''} />
            {remoteState === 'CONNECTED' ? 'Remote Linked' : 'Remote Offline'}
          </div>
        </div>

        {/* Top Right Close Button (X) */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleStop(); }}
          className={`absolute top-8 right-8 p-3.5 bg-vizr-onyx/80 border border-white/10 text-neutral-500 hover:text-vizr-signal hover:border-vizr-signal/30 backdrop-blur-md transition-all duration-300 rounded-xs ${showUI ? 'opacity-100 pointer-events-auto shadow-2xl' : 'opacity-0 pointer-events-none'}`}
          title="Terminate Engine"
        >
          <X size={24} />
        </button>

        <LiveControls
          showUI={showUI}
          livePage={livePage}
          setLivePage={setLivePage}
          handleStop={handleStop}
          audioMode={audioMode}
          filePlaying={filePlaying}
          setFilePlaying={setFilePlaying}
          fileVolume={fileVolume}
          setFileVolume={setFileVolume}
          handleShuffle={handleShuffle}
          handleRandomize={handleRandomize}
          toggleFullscreen={toggleFullscreen}
          visualMode={visualMode}
          globalEffects={globalEffects}
          setGlobalEffects={setGlobalEffects}
          flickerAmount={flickerAmount}
          setFlickerAmount={setFlickerAmount}
          motionAmount={motionAmount}
          setMotionAmount={setMotionAmount}
          eventDensity={eventDensity}
          setEventDensity={setEventDensity}
          transitionSpeed={transitionSpeed}
          setTransitionSpeed={setTransitionSpeed}
          enableGlitch={enableGlitch}
          setEnableGlitch={setEnableGlitch}
          enableVHS={enableVHS}
          setEnableVHS={setEnableVHS}
          enableCurvature={enableCurvature}
          setEnableCurvature={setEnableCurvature}
          enableNoise={enableNoise}
          setEnableNoise={setEnableNoise}
          enableFlicker={enableFlicker}
          setEnableFlicker={setEnableFlicker}
          enableRGBSplit={enableRGBSplit}
          setEnableRGBSplit={setEnableRGBSplit}
          enableDriftOffset={enableDriftOffset}
          setEnableDriftOffset={setEnableDriftOffset}
          enableBlobDynamics={enableBlobDynamics}
          setEnableBlobDynamics={setEnableBlobDynamics}
          overlaySettings={overlaySettings}
          setOverlaySettings={setOverlaySettings}
          engineRef={engineRef}
        />
      </div>
    );
  }

  return (
    <>
      <SetupView
        APP_VERSION={APP_VERSION}
        assets={assets}
        fileInputRef={fileInputRef}
        audioFileInputRef={audioFileInputRef}
        handleFileChange={handleFileChange}
        handleAudioFileChange={handleAudioFileChange}
        setShowAssetInfoModal={setShowAssetInfoModal}
        setView={setView}
        audioMode={audioMode}
      setAudioMode={setAudioMode}
      audioFile={audioFile}
      setAudioFile={setAudioFile}
      devices={devices}
      deviceId={deviceId}
      setDeviceId={setDeviceId}
      audioError={audioError}
      setAudioError={setAudioError}
      visualMode={visualMode}
      setVisualMode={setVisualMode}
      colorMode={colorMode}
      setColorMode={setColorMode}
      globalEffects={globalEffects}
      setGlobalEffects={setGlobalEffects}
      flickerAmount={flickerAmount}
      setFlickerAmount={setFlickerAmount}
      motionAmount={motionAmount}
      setMotionAmount={setMotionAmount}
      eventDensity={eventDensity}
      setEventDensity={setEventDensity}
      transitionSpeed={transitionSpeed}
      setTransitionSpeed={setTransitionSpeed}
      enableGlitch={enableGlitch}
      setEnableGlitch={setEnableGlitch}
      enableVHS={enableVHS}
      setEnableVHS={setEnableVHS}
      enableCurvature={enableCurvature}
      setEnableCurvature={setEnableCurvature}
      enableNoise={enableNoise}
      setEnableNoise={setEnableNoise}
      enableFlicker={enableFlicker}
      setEnableFlicker={setEnableFlicker}
      enableRGBSplit={enableRGBSplit}
      setEnableRGBSplit={setEnableRGBSplit}
      enableDriftOffset={enableDriftOffset}
      setEnableDriftOffset={setEnableDriftOffset}
      enableBlobDynamics={enableBlobDynamics}
      setEnableBlobDynamics={setEnableBlobDynamics}
      overlaySettings={overlaySettings}
      setOverlaySettings={setOverlaySettings}
      handleStart={handleStart}
      setShowRemoteModal={setShowRemoteModal}
      setShowFaqModal={setShowFaqModal}
      setShowAboutModal={setShowAboutModal}
      setShowContactModal={setShowContactModal}
      setShowImpressumModal={setShowImpressumModal}
    />
      {showContactModal && <ContactModal onClose={() => setShowContactModal(false)} />}
      {showImpressumModal && <ImpressumModal onClose={() => setShowImpressumModal(false)} />}
      {showAboutModal && <AboutModal onClose={() => setShowAboutModal(false)} />}
      {showFaqModal && <FaqModal onClose={() => setShowFaqModal(false)} />}
      {showRemoteModal && <RemoteModal roomId={roomId} onClose={() => setShowRemoteModal(false)} />}
      {showAssetInfoModal && <AssetInfoModal onClose={() => setShowAssetInfoModal(false)} />}
    </>
  );
}
