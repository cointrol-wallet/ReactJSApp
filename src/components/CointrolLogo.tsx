import { useTheme } from "@/context/ThemeContext";

type Props = {
  className?: string;
  theme?: "light" | "dark";
};

export function CointrolLogo({ className, theme: themeProp }: Props) {
  const { resolved } = useTheme();
  const mode = themeProp ?? resolved;
  const isDark = mode === "dark";

  return (
    <svg
      viewBox="0 0 1000 1000"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Cointrol logo"
    >
      <defs>
        {/* ---- Charcoal (outer heptagon) ---- */}
        <linearGradient id="cl-charcoal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b2b29" />
          <stop offset="50%" stopColor="#1f1f1d" />
          <stop offset="100%" stopColor="#121210" />
        </linearGradient>
        <linearGradient id="cl-charcoal-hi" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>

        {/* ---- Emerald (hexagon ring) ---- */}
        <linearGradient id="cl-emerald" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b3d2e" />
          <stop offset="35%" stopColor="#126b4f" />
          <stop offset="60%" stopColor="#1da36f" />
          <stop offset="100%" stopColor="#0e5a43" />
        </linearGradient>
        <radialGradient id="cl-emerald-glint" cx="0.45" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#7ef0b4" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0b3d2e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cl-emerald-shadow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#041a12" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#041a12" stopOpacity="0" />
        </linearGradient>

        {/* ---- Gold (pentagon ring) ---- */}
        <linearGradient id="cl-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6e4b12" />
          <stop offset="25%" stopColor="#9c6a1c" />
          <stop offset="50%" stopColor="#c8a24a" />
          <stop offset="70%" stopColor="#d7aa42" />
          <stop offset="100%" stopColor="#7a5318" />
        </linearGradient>
        {/* Brushed-metal highlight band */}
        <linearGradient id="cl-gold-hi" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#fff6cc" stopOpacity="0" />
          <stop offset="40%" stopColor="#fff6cc" stopOpacity="0.3" />
          <stop offset="55%" stopColor="#fff6cc" stopOpacity="0.35" />
          <stop offset="65%" stopColor="#fff6cc" stopOpacity="0" />
          <stop offset="100%" stopColor="#7a5318" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="cl-gold-shadow" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a2506" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3a2506" stopOpacity="0" />
        </linearGradient>

        {/* ---- Slate (diamond) ---- */}
        <linearGradient id="cl-slate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#454b53" />
          <stop offset="50%" stopColor="#2a2f36" />
          <stop offset="100%" stopColor="#1d232a" />
        </linearGradient>
        <linearGradient id="cl-slate-hi" x1="0.3" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.06" />
        </linearGradient>

        {/* ---- Ivory (centre triangle) ---- */}
        <linearGradient id="cl-ivory" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="50%" stopColor="#f4ead8" />
          <stop offset="100%" stopColor="#e9decd" />
        </linearGradient>
        <linearGradient id="cl-ivory-hi" x1="0.5" y1="0" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#e9decd" stopOpacity="0" />
        </linearGradient>

        {/* ---- Theme-adaptive outline ---- */}
        <linearGradient id="cl-outline" x1="0" y1="0" x2="1" y2="1">
          {isDark ? (
            <>
              <stop offset="0%" stopColor="#c8a24a" />
              <stop offset="100%" stopColor="#9c6a1c" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#fffaf0" />
              <stop offset="100%" stopColor="#e9decd" />
            </>
          )}
        </linearGradient>

        {/* ---- Filters (scaled for h-16 UI size) ---- */}
        <filter id="cl-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.18" />
        </filter>
        <filter id="cl-depth" x="-5%" y="-5%" width="110%" height="115%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
        </filter>
      </defs>

      <g filter="url(#cl-shadow)">
        {/* Charcoal heptagon (outermost) */}
        <polygon
          points="374,120 707,188 895,506 706,836 371,901 112,682 112,340"
          fill="url(#cl-charcoal)"
          stroke="url(#cl-outline)"
          strokeWidth="3"
        />
        <polygon
          points="374,120 707,188 895,506 706,836 371,901 112,682 112,340"
          fill="url(#cl-charcoal-hi)"
        />

        {/* Emerald hexagon ring */}
        <g filter="url(#cl-depth)">
          <polygon
            points="236,306 639,189 886,506 639,831 236,708 116,506"
            fill="url(#cl-emerald)"
            stroke="#0a3324"
            strokeWidth="2"
          />
          <polygon
            points="236,306 639,189 886,506 639,831 236,708 116,506"
            fill="url(#cl-emerald-glint)"
          />
          <polygon
            points="236,306 639,189 886,506 639,831 236,708 116,506"
            fill="url(#cl-emerald-shadow)"
          />
        </g>

        {/* Gold pentagon ring (corrected — 5 points) */}
        <g filter="url(#cl-depth)">
          <polygon
            points="236,306 560,203 886,506 560,807 236,708"
            fill="url(#cl-gold)"
            stroke="#5a3d0e"
            strokeWidth="2"
          />
          <polygon
            points="236,306 560,203 886,506 560,807 236,708"
            fill="url(#cl-gold-hi)"
          />
          <polygon
            points="236,306 560,203 886,506 560,807 236,708"
            fill="url(#cl-gold-shadow)"
          />
        </g>

        {/* Slate diamond */}
        <polygon
          points="236,506 560,203 886,506 560,807"
          fill="url(#cl-slate)"
          stroke="#1a1f25"
          strokeWidth="1.5"
        />
        <polygon
          points="236,506 560,203 886,506 560,807"
          fill="url(#cl-slate-hi)"
        />

        {/* Ivory centre triangle (innermost) */}
        <polygon
          points="441,315 441,698 886,506"
          fill="url(#cl-ivory)"
          stroke="#d6ccb8"
          strokeWidth="1"
        />
        <polygon
          points="441,315 441,698 886,506"
          fill="url(#cl-ivory-hi)"
        />
      </g>
    </svg>
  );
}
