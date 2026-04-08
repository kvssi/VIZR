import React from 'react';

export const ToggleSwitch = ({ label, checked, onChange }: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void
}) => (
  <label
    className="flex items-center justify-between gap-3 cursor-pointer py-2.5 px-4 bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 transition-all w-full group"
    onClick={(e) => e.stopPropagation()}
  >
    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 group-hover:text-white transition-colors truncate flex-1 text-left">{label}</span>
    <div className="relative inline-flex items-center shrink-0">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-10 h-5 bg-vizr-onyx border border-white/10 peer peer-checked:border-vizr-signal peer-checked:bg-vizr-signal/20 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-neutral-600 after:h-3.5 after:w-3.5 after:transition-all peer-checked:after:translate-x-5 peer-checked:after:bg-vizr-signal shadow-inner"></div>
    </div>
  </label>
);
