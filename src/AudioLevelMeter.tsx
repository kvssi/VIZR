import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, X } from 'lucide-react';
import { AudioAnalyzer } from './engine/AudioAnalyzer';


export const AudioLevelMeter = ({ mode, file, analyzer, onClearFile }: { mode: 'mic' | 'ambient' | 'screen' | 'file', file?: File, analyzer: any | null, onClearFile?: () => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (mode === 'ambient' || !analyzer) return;
    
    let isMounted = true;
    const draw = () => {
      if (!isMounted) return;
      reqRef.current = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const features = analyzer.getSignalFeatures(performance.now() / 1000);
      const vol = features.rawVol || 0;

      const canvasCtx = canvas.getContext('2d');
      if (!canvasCtx) return;

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      canvasCtx.fillStyle = '#15131A'; // vizr-onyx
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const width = vol * canvas.width * 1.5;
      
      const gradient = canvasCtx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#E0529C');
      gradient.addColorStop(0.6, '#ffffff');
      gradient.addColorStop(1, '#ffffff');
      
      canvasCtx.fillStyle = gradient;
      canvasCtx.fillRect(0, 0, Math.min(width, canvas.width), canvas.height);

      canvasCtx.fillStyle = '#000';
      for (let i = 1; i < 10; i++) {
        canvasCtx.fillRect((canvas.width / 10) * i, 0, 1, canvas.height);
      }
      
      if (mode === 'file') {
         setIsPlaying(analyzer.isFilePlaying());
      }
    };
    draw();

    return () => {
      isMounted = false;
      cancelAnimationFrame(reqRef.current);
    };
  }, [mode, analyzer]);

  const togglePlay = () => {
    if (analyzer) {
      analyzer.togglePlayPause();
      setIsPlaying(analyzer.isFilePlaying());
    }
  };

  if (mode === 'ambient') return null;

  return (
    <div className="mt-3 bg-vizr-surface/30 border border-white/5 p-4 rounded-sm flex flex-col gap-3 shadow-inner">
      {mode === 'file' && file ? (
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <button 
            onClick={togglePlay}
            className="w-10 h-10 flex items-center justify-center bg-vizr-signal text-white rounded-xs hover:scale-105 active:scale-95 transition-all shrink-0 shadow-lg"
            title={isPlaying ? "Pause Preview" : "Play Preview"}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-black tracking-widest text-white truncate font-mono uppercase">{file.name}</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold mt-1">Signal Readout / File</div>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <span className={`text-[9px] uppercase tracking-widest font-black px-2 py-1 rounded-sm border ${isPlaying ? 'border-vizr-signal/50 text-vizr-signal bg-vizr-signal/10 animate-pulse' : 'border-white/10 text-neutral-500 bg-white/5'}`}>
              {isPlaying ? 'Active' : 'Standby'}
            </span>
            {onClearFile && (
              <button 
                onClick={onClearFile}
                className="p-1.5 text-neutral-600 hover:text-white hover:bg-white/5 rounded-sm transition-colors"
                title="Remove File"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-[9px] uppercase tracking-[0.2em] text-neutral-500 font-bold">Signal Level</span>
          <span className="text-[9px] uppercase tracking-[0.2em] text-vizr-signal font-black animate-pulse">Monitoring</span>
        </div>
      )}
      
      <div className="flex flex-col gap-1">
        {mode === 'file' && file && (
          <div className="flex justify-between items-center px-1">
            <span className="text-[8px] uppercase tracking-[0.2em] text-neutral-600 font-bold">Dynamic Amplitude</span>
          </div>
        )}
        <canvas ref={canvasRef} width={300} height={10} className="w-full h-2.5 rounded-sm overflow-hidden bg-black shadow-inner border border-white/5" />
      </div>
    </div>
  );
};
