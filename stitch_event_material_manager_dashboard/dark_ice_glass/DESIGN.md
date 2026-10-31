---
name: Dark Ice Glass
colors:
  surface: '#0b1228'
  surface-dim: '#0b1228'
  surface-bright: '#323850'
  surface-container-lowest: '#060d23'
  surface-container-low: '#141a31'
  surface-container: '#181f35'
  surface-container-high: '#222940'
  surface-container-highest: '#2d344b'
  on-surface: '#dce1ff'
  on-surface-variant: '#ccc3d5'
  inverse-surface: '#dce1ff'
  inverse-on-surface: '#292f47'
  outline: '#958e9f'
  outline-variant: '#4a4453'
  surface-tint: '#d2bcff'
  primary: '#d2bcff'
  on-primary: '#3e008e'
  primary-container: '#8054d8'
  on-primary-container: '#f9f1ff'
  inverse-primary: '#6f41c6'
  secondary: '#48ebfb'
  on-secondary: '#00363b'
  secondary-container: '#00cfde'
  on-secondary-container: '#00545a'
  tertiary: '#69d3ff'
  on-tertiary: '#003546'
  tertiary-container: '#00789a'
  on-tertiary-container: '#e6f5ff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#eaddff'
  primary-fixed-dim: '#d2bcff'
  on-primary-fixed: '#25005a'
  on-primary-fixed-variant: '#5624ac'
  secondary-fixed: '#84f3ff'
  secondary-fixed-dim: '#2adae9'
  on-secondary-fixed: '#002023'
  on-secondary-fixed-variant: '#004f55'
  tertiary-fixed: '#bee9ff'
  tertiary-fixed-dim: '#69d3ff'
  on-tertiary-fixed: '#001f2a'
  on-tertiary-fixed-variant: '#004d64'
  background: '#0b1228'
  on-background: '#dce1ff'
  surface-variant: '#2d344b'
typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
  mono-code:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-mobile: 0.75rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

This design system blends **Dark Glassmorphism** with **Technical Luxury** tailored specifically for high-stakes event equipment and inventory management (*Gestion de Matériel Événementiel*). The visual direction combines the depth of deep midnight naval space with precision-milled glacial luminescence, evoking absolute reliability, technical control, and modern sophistication.

### Target Audience & Operational Reality
Designed for warehouse directors, stage technicians, logistics coordinators, and event production managers. The interface prioritizes rapid scanning, telemetry clarity, dense asset tracking, and state validation in high-pressure or dimly-lit operational environments (control booths, backstage spaces, nocturnal field deployments).

### Aesthetic Language
- **Luminous Layering:** Deep, near-infinite midnight bases overlaid with layered, translucent sheets of smoked glass.
- **Specular Refraction:** Micro-fine borders (1px) capturing ambient gradient highlights ranging from electric cyan to radiant violet, mimicking refraction along frozen crystal edges.
- **Controlled Neon Bloom:** Soft, localized glow effects designating asset health, availability, battery states, and mission-critical alerts without introducing visual clutter or light bleed.

## Colors

The color palette leverages deep nocturnal absorption contrasted with razor-sharp photonic accents. 

### Foundation Surfaces
- **Canvas Base (`#080F25`):** Deep midnight void ensuring zero eye fatigue and maximum optical contrast.
- **Surface Navy / Container Tier 1 (`#101C38`):** Base structural container color, commonly rendered at `65%` to `80%` opacity with backdrop blur.
- **Violet Elevation / Container Tier 2 (`#1E163B` / `#38265D`):** Rich chromatic dark substrate for selected states, elevated drawer panels, and contextual highlights.

### Luminescence & Accents
- **Primary Violet Accent (`#8054D8`):** Applied to primary actions, selected operational modes, and major milestones.
- **Icy Cyan Accent (`#27D9E8`):** Expresses high-priority telemetry, active equipment in-transit status, and real-time connectivity indicators.
- **Glacial Light Blue (`#42BDEB`):** Secondary informational data points, specular border highlights, and secondary interactive states.

### Data & Feedback Accents
- **Success / In-Stock:** `#1FE08F` (Subtle mint neon)
- **Warning / Inspection Due:** `#FFB743` (Amber halogen)
- **Critical / Missing / Overdue:** `#FF4B72` (Fluorescent ruby)

### Typographic Contrast
- **Crisp High-Contrast Text (`#F4F7FF`):** Maximum legibility for dense technical readouts, IDs, and titles.
- **Subdued Slate Text (`#AAB6CC`):** Secondary information, table headers, metadata, and default border strokes (rendered at `15%` to `35%` opacity).

## Typography

The type system prioritizes structural hierarchy and rapid numeric consumption:

- **Primary Typeface (Plus Jakarta Sans):** Selected for clean geometric clarity, generous apertures, and balanced x-height. Ensures instant legibility across complex tabular data and dense dashboard cards without visual exhaustion.
- **Monospace Companion (JetBrains Mono):** Dedicated to technical data fields: serial numbers, barcode/QR string payloads, flight case identifiers, DMX channel offsets, timestamps, and inventory SKUs.

### Formatting Rules
- **Tracking:** Headings maintain slightly tighter tracking (`-0.015em`) to anchor attention. Dense table labels and uppercase tags utilize open letter-spacing (`+0.05em` to `+0.08em`).
- **Tabular Numerics:** Enable OpenType tabular numbers (`tnum`) across all pricing, inventory quantities, and timeline coordinates to ensure rigid vertical alignment during live shifts.

## Layout & Spacing

The layout is built upon an adaptive 12-column fluid grid tailored to high-density administrative operations.

### Structure & Density
- **Desktop (1280px and above):** 12-column structure with fixed collapsible left sidebar navigation (240px expanded, 72px icon rail), outer canvas margin of `2rem`, and internal module gaps of `1.25rem`. Multi-pane layouts accommodate side-by-side inventory manifests and live dispatch tracking.
- **Tablet (768px – 1279px):** 8-column layout. Drawers and detail inspection panels transition from static splits to slide-over glass panels. Margin adjusts to `1.5rem`.
- **Mobile (Below 768px):** 4-column layout with `1rem` margin and `0.75rem` gutter. Operational workflows reflow into unified vertical card stacks; bulk selection bars dock persistently to the bottom safe zone.

### Spacing Discipline
Spacing follows an exact 4px / 8px scale. Density in data grids and manifests prioritizes content volume: vertical cell padding utilizes `space-sm` (`0.5rem`), while overarching dashboard panels and glass container walls breathe with `space-lg` (`1.5rem`) internal padding.

## Elevation & Depth

Depth is established through physical glass properties—chromatic opacity, backdrop filtration, specular edge illumination, and ambient photonic dissipation—rather than traditional drop shadows.

### Glassmorphism Hierarchy

1. **Base Layer (Level 0):** Flat `#080F25` background supplemented by ultra-subtle ambient mesh glows (radial gradients: `#38265D` at 15% opacity, `#27D9E8` at 8% opacity with 120px blur).
2. **Standard Surface Cards (Level 1):**
   - Background: `rgba(16, 28, 56, 0.65)`
   - Backdrop filter: `blur(16px) saturate(180%)`
   - Border: `1px solid rgba(170, 182, 204, 0.12)`
   - Box Shadow: `0 8px 32px 0 rgba(4, 9, 24, 0.37)`
3. **Elevated Panels & Flyouts (Level 2):**
   - Background: `rgba(22, 36, 70, 0.75)`
   - Backdrop filter: `blur(24px) saturate(190%)`
   - Border: Linear gradient stroke from `rgba(66, 189, 235, 0.35)` (top-left) to `rgba(128, 84, 216, 0.15)` (bottom-right).
   - Box Shadow: `0 16px 40px 0 rgba(3, 7, 18, 0.55), inset 0 1px 1px 0 rgba(244, 247, 255, 0.15)`
4. **Modal Overlays & Critical Alerts (Level 3):**
   - Scrim: `rgba(8, 15, 37, 0.8)` with `backdrop-filter: blur(12px)`
   - Window: `rgba(16, 28, 56, 0.9)` with specular edge glow: `0 0 24px rgba(39, 217, 232, 0.15)`.

### Specular Reflections
Interactive elements feature an inset micro-highlight along their top edge: `box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.18)`, providing the tactile illusion of hand-polished sapphire crystal.

## Shapes

The design system employs a **Rounded** shape philosophy (Scale 2), engineered to balance sleek modern glass elegance with structural industrial precision.

### Geometric Rules
- **Base Components (Inputs, Buttons, Dropdowns):** `0.5rem` (8px) radius. Ensures snappy, architectural definition without feeling toy-like.
- **Glass Containers & Panels (`rounded-lg`):** `1rem` (16px) radius. Softens boundary lines between translucent sheets and deep canvas backgrounds.
- **Modals & Master Drawers (`rounded-xl`):** `1.5rem` (24px) radius.
- **Pills & Status Indicators:** `9999px` full curve. Badges, counter bubbles, and live equipment status capsules use completely rounded geometries to visually contrast against the squared boundaries of cards and data grids.

## Components

### Buttons
- **Primary Action (Vivid Violet Glass):** Built with background `linear-gradient(135deg, #8054D8 0%, #6336BE 100%)`, 1px border `rgba(244, 247, 255, 0.35)`, text `#F4F7FF`. Hover triggers an icy cyan ambient glow (`box-shadow: 0 0 16px rgba(128, 84, 216, 0.5)`).
- **Secondary Action (Ice Glass):** Semi-transparent `rgba(39, 217, 232, 0.08)`, border `1px solid rgba(39, 217, 232, 0.3)`, text `#27D9E8`. Hover shifts background to `rgba(39, 217, 232, 0.18)`.
- **Tertiary / Ghost:** Borderless transparent container, text `#AAB6CC`, shifts to `rgba(170, 182, 204, 0.1)` on hover.

### Status Chips & Badges
- Pill-shaped (`rounded-full`) containers with padding `0.25rem 0.75rem`.
- Composed of translucent colored fills (`12%` opacity), crisp matching text, and a pulsing 6px circular LED dot.
  - *Available / Ready:* Fill `rgba(31, 224, 143, 0.12)`, text `#1FE08F`, dot `#1FE08F`.
  - *Reserved / In-Transit:* Fill `rgba(39, 217, 232, 0.12)`, text `#27D9E8`, dot `#27D9E8`.
  - *Maintenance / Fault:* Fill `rgba(255, 75, 114, 0.12)`, text `#FF4B72`, dot `#FF4B72`.

### Inputs & Form Controls
- Dark translucent fill `rgba(8, 15, 37, 0.6)` with inset border `1px solid rgba(170, 182, 204, 0.18)`.
- Text `#F4F7FF`, placeholder `#AAB6CC` at 50% opacity.
- Focus State: Smooth glow transition; border illuminates with `#27D9E8` accompanied by `box-shadow: 0 0 12px rgba(39, 217, 232, 0.25)`.
- Numeric inputs for logistics (weight, dimensions, channel offsets) render monospace font.

### Checkboxes & Radios
- Box `18px × 18px`, radius `4px` (checkbox) or `rounded-full` (radio).
- Surface `rgba(16, 28, 56, 0.8)`, border `1px solid rgba(170, 182, 204, 0.25)`.
- Selected state activates background `#8054D8` with checkmark icon rendered in `#F4F7FF`.

### Lists & Manifest Data Tables
- Table header features sticky frozen glass styling (`rgba(16, 28, 56, 0.85)`, backdrop blur, bottom border `1px solid rgba(170, 182, 204, 0.12)`).
- Alternate row striping avoided; rows use subtle hover transition to `rgba(66, 189, 235, 0.05)` with an active left edge indicator in `#27D9E8`.
- Compact column density with explicit monospaced columns for QR/Asset tags.

### Specialized Event Equipment Modules
- **Flight Case Tracker Card:** Translucent container showing a 3D-inspired glass wireframe layout of the flight case contents with mini equipment health pips.
- **Power & Signal Telemetry Gauge:** Circular or bar progress indicators illuminated with cyan-to-violet linear gradients, displaying total wattage and DMX universe loads against safe capacity thresholds.