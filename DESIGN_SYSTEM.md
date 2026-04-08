# VIZR Design System: "Artifact Industrial"

## Core Philosophy
The VIZR interface is not a website; it is a high-fidelity, machined-hardware instrument engineered for live performance. It relies on tight geometry, extreme contrast, and structural hierarchy over decorative borders.

## Color Palette
The color system uses deep, matte backgrounds with singular, aggressive high-contrast accents.

| Token | Hex Value | Usage |
| :--- | :--- | :--- |
| `vizr-onyx` | `#15131A` | Absolute background layer. Space and depth. |
| `vizr-surface` | `#1F1D24` | Interactive areas, cards, elevated modules. |
| `vizr-slate` | `#2A2A30` | Hover states, secondary borders, active lines. |
| `vizr-signal` | `#E0529C` | **Signal Pink.** The sole accent color. Used strictly for active states, critical data, pulse indicators, and live tracking. |

## Typography
Typography is technical, data-driven, and highly tracked.

- **Primary Stack:** `font-sans` (Inter/System) for standard UI text.
- **Instrument Stack:** `font-mono` (Space Grotesk or monospace equivalent) for all labels, data readouts, and module headers.
- **Styling Rules:**
  - **Module Headers:** `text-[10px] uppercase font-black tracking-[0.2em] text-neutral-600`
  - **Values/Data:** `text-[10px] font-black text-white px-1.5 py-0.5 border border-white/5 bg-vizr-surface`
  - **Micro-labels:** `text-[9px] uppercase font-bold tracking-widest text-neutral-500`

## Structural Components

### 1. Surfaces
- **No Heavy Borders:** Use `border border-white/5` exclusively. Avoid thick strokes.
- **Radii:** Use `rounded-sm` or `rounded-xs` for sharp, machined edges. Never use `rounded-2xl` or pill shapes for primary architecture.

### 2. Buttons & Triggers
- **Standard Trigger:** `bg-vizr-surface border border-white/5 hover:border-vizr-signal/30 text-neutral-400 hover:text-white transition-all`
- **Active/Primary:** `bg-vizr-signal text-white font-black uppercase tracking-[0.3em]`
- **Macro Pads:** Large hit-areas (`h-28`) with high-contrast active states (`active:bg-vizr-signal active:text-white`).

### 3. Sliders & Calibrators
- Remove native styling (`appearance-none`).
- Use thin tracks (`h-1 bg-white/5`).
- Accents react aggressively to `vizr-signal` (`accent-vizr-signal`).

### 4. Interactive Feedback
- Rely heavily on `group-hover:text-vizr-signal` to indicate reactivity before click.
- Use `animate-pulse` strictly for live data lines (e.g., "Monitoring", "Signal Readout").

## Integration Rules
- `App.tsx` remains a pure orchestrator. It holds state but **no** complex UI markup.
- UI elements must live in `src/ui/`.
- No inline styles for colors; strictly use Tailwind variables mapped in `:root` of `index.css`.
