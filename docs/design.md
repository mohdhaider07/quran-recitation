# Design System & UI/UX Guidelines — Quran Ambience

[← Back to AGENT.md](../AGENT.md)

---

## 1. Design Philosophy

**Quran Ambience** embodies **Spiritual Serenity and Modern Elegance**. The user interface is crafted to evoke peace, mindfulness, and clarity, avoiding visual noise while delivering a premium, polished, state-of-the-art aesthetic.

Key Design Tenets:

- **Calm & Focused**: Interfaces should never distract from the recitation and contemplation.
- **Glassmorphic Depth**: Translucent surfaces, refined borders, and soft layered blurs create depth without heavy visual clutter.
- **Dynamic & Alive**: Subtle micro-animations (pulsing audio rings, gentle shimmers, smooth slide-up drawers) provide tangible feedback for every user interaction.

---

## 2. Visual Tokens & Theming

### 2.1 Color Palette

The color system emphasizes natural emerald, teal, and slate tones that reflect peace and spirituality:

| Token                  | Light Theme                    | Dark Theme                      | Purpose                             |
| :--------------------- | :----------------------------- | :------------------------------ | :---------------------------------- |
| **Primary Accent**     | Emerald-600 / Teal-600         | Emerald-400 / Teal-400          | Active controls, highlights         |
| **Gradients**          | `from-teal-600 to-emerald-600` | `from-teal-500 to-emerald-500`  | Play button, active list items      |
| **Surface Background** | `white/60` backdrop blur       | `slate-900/60` backdrop blur    | Card surfaces, interactive triggers |
| **Borders**            | `teal-100` / `border-white/20` | `slate-800` / `border-white/10` | Delicate structural demarcation     |
| **Muted Text**         | `slate-500` / `teal-800/70`    | `slate-400` / `teal-400/80`     | Subtitles, labels, timestamps       |

### 2.2 Glassmorphic Card Styling (`GlassCard`)

All prominent content blocks utilize the `GlassCard` abstraction:

- **Backdrop Blur**: `backdrop-blur-md` (cards) and `backdrop-blur-2xl` (drawer overlays).
- **Translucency**: `bg-white/60 to-white/30` in light mode, `bg-slate-900/60 to-slate-900/30` in dark mode.
- **Micro-Borders**: Soft 1px border with hover glow transitions.
- **Atmospheric Background**: A fixed radial dot grid pattern overlay (`radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`) at 3% opacity adds tactile texture across all screen resolutions.

---

## 3. Typography & Scripts

### 3.1 Arabic Typography

- **Font Stack**: Arabic script fonts (Amiri, Scheherazade New, or Traditional Arabic typography) with appropriate line-height (`leading-relaxed`).
- **Direction**: Strict `dir="rtl"` applied to Arabic titles and reciter names for natural bidirectional flow.

### 3.2 Latin / Interface Typography

- **Font Stack**: Modern geometric sans-serif (Inter or system UI sans-serif).
- **Numerals**: `tabular-nums` applied to timestamps and volume percentages to prevent jitter during playback progression.
- **Tracking**: Uppercase micro-labels use `tracking-[0.2em]` for enhanced scannability.

---

## 4. Component Hierarchy & UX Flow

```
Main Layout (12-Column Responsive Grid)
├── Primary Column (8 Cols)
│   ├── Header (Logo, Gradient Title, Subtitle)
│   └── QuranPlayer
│       ├── SectionHeader ("Holy Quran")
│       ├── Selection Triggers (Reciter & Juz)
│       ├── Slide-Up Drawer Overlays (Reciter Drawer & Juz Drawer)
│       └── Bottom Controls Bar
│           ├── Time Readout & Read-Only Juz Progress Bar
│           ├── Reciter / Surah Playing Status
│           ├── Core Controls (Prev Juz, Play/Pause, Next Juz)
│           └── Volume Slider & Mute Toggle
└── Secondary Column (4 Cols)
    ├── AmbianceMixer (Quick Presets, Reset, 5 Sound Volume Sliders)
    └── Pro Tip GlassCard
```

### 4.1 Selection Drawers (Reciter & Juz)

- Clicking a trigger opens a full-height glassmorphic drawer overlay that slides up smoothly (`translate-y-0 opacity-100`).
- **Reciter Drawer**: Shows all 15 high-speed CDN reciters with their English name, Arabic script name, and recitation style badge (`Murattal` / `Mujawwad`). Active reciter is highlighted with the primary gradient.
- **Juz Drawer**: Lists Juz 1 to 30 with Para numbering.
- **Ayat Selection**: Intentionally removed from the interface to focus exclusively on uninterrupted Juz listening.

### 4.2 Main Playback Controls

- **Play / Pause**: Large focal button with gradient background and subtle active scaling (`active:scale-95`). Shows a spinner (`Loader2`) when buffering.
- **Previous Juz (`SkipBack`)**: Navigates to `juz - 1`. Disabled on Juz 1.
- **Next Juz (`SkipForward`)**: Navigates to `juz + 1`. Disabled on Juz 30.
- **Progress Bar**: Read-only visualization displaying current elapsed time on the left and total Juz duration on the right.

### 4.3 Ambiance Sound Mixer

- **Quick Preset Buttons**: Rain, Night, Birds, Calm.
- **Reset Button**: Easily resets all ambient sound tracks to 0 with a single tap.
- **Individual Sliders**: 5 nature sounds (Rain, Lightning, Birds, Water Droplets, Forest Pine) with active color reaction.

---

## 5. Responsive Grid & Touch Targets

- **Desktop (lg: 1024px+)**: 12-column grid. Left 8 columns hold the Quran Player; right 4 columns hold the sticky Ambiance Mixer.
- **Mobile & Tablet (< 1024px)**: Single column stacked layout.
- **Minimum Hit Target**: All interactive touch targets (buttons, icons, slider thumbs) meet the minimum 44×44px standard for mobile usability.

---

[← Back to AGENT.md](../AGENT.md)
