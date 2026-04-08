import React, { useState } from 'react';
import { Trash2, Plus, X, Image as ImageIcon, RefreshCw, Zap, Activity } from 'lucide-react';
import type { AssetType, AssetAspect, AssetColor, AssetBehavior, ImageMetadata, AssetItem } from './assetTypes';

export const parseMetadata = (file: File, img: HTMLImageElement): ImageMetadata => {

  const filename = file.name.toLowerCase();
  const parts = filename.split('.')[0].split('__');
  
  let type: AssetType | undefined;
  let aspect: AssetAspect | undefined;
  let color: AssetColor | undefined;
  let behavior: AssetBehavior | undefined;

  const types = ['bg', 'poster', 'overlay', 'logo', 'flash'];
  const aspects = ['landscape', 'portrait', 'square'];
  const colors = ['mono', 'accent', 'color'];
  const behaviors = ['frequent', 'rare', 'peak'];

  parts.forEach(part => {
    if (types.includes(part)) type = part as AssetType;
    if (aspects.includes(part)) aspect = part as AssetAspect;
    if (colors.includes(part)) color = part as AssetColor;
    if (behaviors.includes(part)) behavior = part as AssetBehavior;
  });

  const ratio = img.width / img.height;
  const autoAspect = ratio > 1.1 ? 'landscape' : ratio < 0.9 ? 'portrait' : 'square';
  
  // Auto classification fallback
  if (!type) {
    if (file.type === 'image/png') {
      type = 'overlay';
    } else if (ratio > 1.2) {
      type = 'bg';
    } else {
      type = 'poster';
    }
  }

  return {
    type: type || 'bg',
    aspect: aspect || autoAspect,
    color: color || 'color',
    behavior: behavior || 'frequent'
  };
};


export const AssetEditor = ({ assets, onAssetsChange, onAddMore, onClose }: { 
  assets: AssetItem[], 
  onAssetsChange: (assets: AssetItem[]) => void,
  onAddMore: () => void,
  onClose: () => void 
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(assets.length > 0 ? 0 : null);
  const selectedAsset = selectedIndex !== null ? assets[selectedIndex] : null;

  const updateMetadata = (updates: Partial<ImageMetadata>) => {
    if (selectedIndex === null) return;
    const newAssets = [...assets];
    newAssets[selectedIndex] = {
      ...newAssets[selectedIndex],
      metadata: { ...newAssets[selectedIndex].metadata, ...updates }
    };
    onAssetsChange(newAssets);
  };

  const getGeneratedFilename = (asset: AssetItem) => {
    const { type, aspect, color, behavior } = asset.metadata;
    const ext = asset.file.name.split('.').pop();
    return `${type}__${aspect}__${color}__${behavior}.${ext}`;
  };

  const removeAsset = (index: number) => {
    const newAssets = assets.filter((_, i) => i !== index);
    onAssetsChange(newAssets);
    if (selectedIndex === index) {
      setSelectedIndex(newAssets.length > 0 ? 0 : null);
    } else if (selectedIndex !== null && selectedIndex > index) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  return (
    <div className="fixed inset-0 bg-vizr-onyx text-neutral-300 font-mono flex flex-col z-50">
      {/* Header */}
      <div className="h-14 border-b border-white/5 flex items-center justify-between px-6 bg-vizr-onyx">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-white">Asset Editor</h2>
          <span className="text-[10px] text-vizr-signal uppercase tracking-[0.3em] font-black border border-vizr-signal/30 px-2 py-1">Smart Protocol</span>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/5 transition-colors text-neutral-500 hover:text-white"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Image List */}
        <div className="w-64 border-r border-neutral-800 flex flex-col bg-neutral-950/50">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Inventory ({assets.length})</span>
            <button 
              onClick={onAddMore}
              className="p-1 hover:bg-white/5 transition-colors text-vizr-signal hover:text-white"
              title="Add more assets"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {assets.map((asset, i) => (
              <div key={i} className="group relative">
                <button
                  onClick={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 p-2 transition-all text-left ${
                    selectedIndex === i ? 'bg-vizr-signal text-white' : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`w-10 h-10 overflow-hidden flex-shrink-0 border ${selectedIndex === i ? 'border-white/20' : 'border-white/5'}`}>
                    <img src={asset.image.src} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] font-black truncate uppercase tracking-tight ${selectedIndex === i ? 'text-white' : 'text-neutral-300'}`}>
                      {asset.file.name}
                    </div>
                    <div className={`text-[8px] uppercase tracking-widest mt-0.5 ${selectedIndex === i ? 'text-white/60' : 'text-neutral-600'}`}>
                      {asset.metadata.type} • {asset.metadata.aspect}
                    </div>
                  </div>
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAsset(i);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 transition-all opacity-0 group-hover:opacity-100 ${
                    selectedIndex === i ? 'text-white/40 hover:text-white hover:bg-black/10' : 'text-neutral-600 hover:text-vizr-signal hover:bg-vizr-signal/10'
                  }`}
                  title="Remove asset"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {assets.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-neutral-600 p-4 text-center">
                <ImageIcon size={24} className="mb-2 opacity-20" />
                <span className="text-[10px] uppercase tracking-widest">No assets loaded</span>
                <button 
                  onClick={onAddMore}
                  className="mt-4 px-3 py-2 border border-neutral-800 hover:border-neutral-600 text-[10px] uppercase tracking-widest transition-colors"
                >
                  Add Assets
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Large Preview */}
        <div className="flex-1 bg-neutral-900/30 flex items-center justify-center p-12 relative overflow-hidden">
          {/* Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
          
          {selectedAsset ? (
            <div className="relative group max-w-full max-h-full flex items-center justify-center">
              <img 
                src={selectedAsset.image.src} 
                alt="" 
                className="max-w-full max-h-full object-contain shadow-2xl border border-neutral-800 bg-black"
              />
              <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
                <span className="text-[10px] text-neutral-600 uppercase tracking-widest bg-black/50 px-2 py-1 rounded">
                  {selectedAsset.image.width} × {selectedAsset.image.height} px
                </span>
              </div>
            </div>
          ) : (
            <div className="text-neutral-700 uppercase tracking-[0.2em] text-xs">Select an asset to preview</div>
          )}
        </div>

        {/* RIGHT: Info & Controls */}
        <div className="w-80 border-l border-neutral-800 flex flex-col bg-neutral-950">
          {selectedAsset ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* File Info */}
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Material Analysis</label>
                <div className="p-3 bg-vizr-onyx border border-white/5">
                  <div className="text-xs text-white break-all font-black uppercase tracking-tight">{selectedAsset.file.name}</div>
                  <div className="text-[9px] text-neutral-600 mt-1 uppercase tracking-[0.2em]">
                    {(selectedAsset.file.size / 1024).toFixed(1)} KB • {selectedAsset.file.type}
                  </div>
                </div>
              </div>

              {/* Protocol Assignment */}
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Role (Required)</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['bg', 'poster', 'overlay', 'logo', 'flash'].map(t => (
                      <button
                        key={t}
                        onClick={() => updateMetadata({ type: t as AssetType })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all ${
                          selectedAsset.metadata.type === t 
                            ? 'bg-vizr-signal text-white border-vizr-signal font-black' 
                            : 'border-white/5 text-neutral-500 hover:border-white/10'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Spatial Constraint</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['landscape', 'portrait', 'square'].map(a => (
                      <button
                        key={a}
                        onClick={() => updateMetadata({ aspect: a as AssetAspect })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all ${
                          selectedAsset.metadata.aspect === a 
                            ? 'bg-vizr-signal text-white border-vizr-signal font-black' 
                            : 'border-white/5 text-neutral-500 hover:border-white/10'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Chromatic Array</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['mono', 'accent', 'color'].map(c => (
                      <button
                        key={c}
                        onClick={() => updateMetadata({ color: c as AssetColor })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all ${
                          selectedAsset.metadata.color === c 
                            ? 'bg-vizr-signal text-white border-vizr-signal font-black' 
                            : 'border-white/5 text-neutral-500 hover:border-white/10'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Behavioral Logic</label>
                  <div className="grid grid-cols-3 gap-1">
                    {['frequent', 'rare', 'peak'].map(b => (
                      <button
                        key={b}
                        onClick={() => updateMetadata({ behavior: b as AssetBehavior })}
                        className={`px-3 py-2 text-[10px] uppercase tracking-widest border transition-all ${
                          selectedAsset.metadata.behavior === b 
                            ? 'bg-vizr-signal text-white border-vizr-signal font-black' 
                            : 'border-white/5 text-neutral-500 hover:border-white/10'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Protocol Identifier */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-600">Protocol Path</label>
                <div className="p-3 bg-white/5 border border-white/5 group relative flex items-center justify-between">
                  <div className="text-[10px] text-white font-mono break-all font-black uppercase">{getGeneratedFilename(selectedAsset)}</div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(getGeneratedFilename(selectedAsset))}
                    className="p-2 text-neutral-500 hover:text-vizr-signal transition-colors"
                    title="Copy Identification"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
              </div>

              {/* Execution */}
              <div className="pt-6 space-y-2">
                <button 
                  onClick={onClose}
                  className="w-full py-4 bg-vizr-signal text-white text-xs font-black uppercase tracking-[0.3em] transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                >
                   Execute Strategy
                </button>
                <button 
                  onClick={() => {
                    const downloadAnchorNode = document.createElement('a');
                    downloadAnchorNode.setAttribute("href", selectedAsset.image.src);
                    downloadAnchorNode.setAttribute("download", getGeneratedFilename(selectedAsset));
                    document.body.appendChild(downloadAnchorNode);
                    downloadAnchorNode.click();
                    downloadAnchorNode.remove();
                  }}
                  className="w-full py-3 border border-white/5 text-neutral-600 text-[10px] font-black uppercase tracking-widest hover:text-white hover:border-white/10 transition-all"
                >
                  Export Identifier
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-neutral-700 p-12 text-center">
              <div className="space-y-4">
                <Activity size={32} className="mx-auto opacity-10" />
                <p className="text-[10px] uppercase tracking-[0.2em] leading-relaxed">Select an asset from the list to begin analysis and role assignment</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

