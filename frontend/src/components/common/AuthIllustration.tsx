import { useId } from 'react';
import { cn } from '@/utils/cn';

interface AuthIllustrationProps {
  className?: string;
}

/**
 * Decorative vector artwork for the auth split-panel: a gradient sphere with a
 * stylised analyst figure and orbiting finance badges. Purely presentational —
 * hidden from assistive tech via `aria-hidden`.
 *
 * Badges float on staggered delays so the orbit never reads as a single
 * synchronised bounce.
 */
export function AuthIllustration({ className }: AuthIllustrationProps) {
  // The artwork renders twice per page (compact banner + full panel). Gradient
  // ids must be unique per instance, otherwise `url(#...)` resolves to the copy
  // inside the hidden container and the referencing shape paints nothing.
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  return (
    <svg
      viewBox="0 0 480 480"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('h-full w-full', className)}
    >
      <defs>
        {/* Deep blue core so the sphere separates from the violet panel behind it */}
        <radialGradient id={id('sphere')} cx="30%" cy="25%" r="85%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="45%" stopColor="#3730A3" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </radialGradient>
        <linearGradient id={id('leaf')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={id('badge-a')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="100%" stopColor="#DB2777" />
        </linearGradient>
        <linearGradient id={id('badge-b')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id={id('badge-c')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={id('badge-d')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id={id('badge-e')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A78BFA" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>

      {/* Backdrop foliage — abstract leaf shapes behind the sphere */}
      <g opacity="0.9">
        <path
          d="M78 96c46-34 96-26 118 8-38 10-64 34-74 72-32-18-54-52-44-80Z"
          fill={`url(#${id('leaf')})`}
        />
        <path
          d="M404 340c-28 44-76 60-110 42 28-28 40-60 34-100 38 8 66 34 76 58Z"
          fill={`url(#${id('leaf')})`}
        />
        <path
          d="M60 348c34-30 74-34 100-14-30 18-46 44-48 82-30-16-52-44-52-68Z"
          fill={`url(#${id('leaf')})`}
          opacity="0.7"
        />
      </g>

      {/* Core sphere */}
      <circle cx="240" cy="240" r="150" fill={`url(#${id('sphere')})`} />
      <circle
        cx="240"
        cy="240"
        r="150"
        fill="none"
        stroke="#C7D2FE"
        strokeOpacity="0.25"
        strokeWidth="1.5"
      />
      {/* Specular highlight */}
      <ellipse cx="190" cy="176" rx="58" ry="40" fill="#fff" opacity="0.08" />

      {/* Constellation links between badges */}
      <g
        stroke="#C7D2FE"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="5 7"
        strokeLinecap="round"
      >
        <path d="M120 150 L240 236" />
        <path d="M368 138 L240 236" />
        <path d="M400 268 L240 236" />
        <path d="M116 330 L240 236" />
        <path d="M268 400 L240 236" />
      </g>

      {/* Analyst figure — stylised, reaching toward the rising-trend badge */}
      <g>
        {/* Rear arm, swung back */}
        <path
          d="M221 212 197 258"
          stroke="#5B21B6"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* Legs */}
        <rect
          x="221"
          y="258"
          width="17"
          height="70"
          rx="8.5"
          fill="#4F46E5"
          transform="rotate(-7 229.5 258)"
        />
        <rect
          x="243"
          y="258"
          width="17"
          height="70"
          rx="8.5"
          fill="#6366F1"
          transform="rotate(7 251.5 258)"
        />
        {/* Shoes */}
        <ellipse cx="212" cy="330" rx="13" ry="7" fill="#C7D2FE" />
        <ellipse cx="270" cy="330" rx="13" ry="7" fill="#C7D2FE" />
        {/* Torso */}
        <rect x="214" y="188" width="52" height="82" rx="24" fill="#7C3AED" />
        {/* Front arm reaching up toward the trend badge */}
        <path
          d="M261 206 302 178"
          stroke="#8B5CF6"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <circle cx="307" cy="175" r="9" fill="#FBCFE8" />
        {/* Neck, head, hair */}
        <rect x="234" y="176" width="12" height="16" rx="6" fill="#F9A8D4" />
        <circle cx="240" cy="164" r="22" fill="#FBCFE8" />
        <path
          d="M218 162c0-15 11-26 24-26 14 0 24 10 24 23-8-6-17-8-27-6-9 2-16 5-21 9Z"
          fill="#1E1B4B"
        />
      </g>

      {/* Orbiting badges */}
      <g className="animate-float" style={{ animationDelay: '0s' }}>
        <circle cx="120" cy="150" r="34" fill={`url(#${id('badge-a')})`} />
        <circle cx="120" cy="150" r="34" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        {/* Bar chart */}
        <g fill="#fff">
          <rect x="106" y="150" width="7" height="16" rx="2" />
          <rect x="117" y="142" width="7" height="24" rx="2" />
          <rect x="128" y="134" width="7" height="32" rx="2" />
        </g>
      </g>

      <g className="animate-float" style={{ animationDelay: '0.8s' }}>
        <circle cx="368" cy="138" r="30" fill={`url(#${id('badge-b')})`} />
        <circle cx="368" cy="138" r="30" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        {/* Dollar */}
        <path
          d="M368 122v32M377 129c0-5-4-8-9-8s-9 3-9 7 4 6 9 7 9 3 9 8-4 8-9 8-9-3-9-8"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      <g className="animate-float" style={{ animationDelay: '1.6s' }}>
        <circle cx="400" cy="268" r="28" fill={`url(#${id('badge-c')})`} />
        <circle cx="400" cy="268" r="28" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        {/* Trend arrow */}
        <path
          d="M388 275l8-9 6 6 10-13"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path d="M405 259h9v9" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      <g className="animate-float" style={{ animationDelay: '2.4s' }}>
        <circle cx="116" cy="330" r="30" fill={`url(#${id('badge-d')})`} />
        <circle cx="116" cy="330" r="30" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        {/* Document */}
        <path
          d="M105 317h16l8 8v22a3 3 0 0 1-3 3h-21a3 3 0 0 1-3-3v-27a3 3 0 0 1 3-3Z"
          fill="#fff"
        />
        <g stroke="#0284C7" strokeWidth="2.5" strokeLinecap="round">
          <path d="M110 334h13M110 340h9" />
        </g>
      </g>

      <g className="animate-float" style={{ animationDelay: '3.2s' }}>
        <circle cx="268" cy="400" r="26" fill={`url(#${id('badge-e')})`} />
        <circle cx="268" cy="400" r="26" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
        {/* Pie slice */}
        <path d="M268 400v-13a13 13 0 0 1 13 13Z" fill="#fff" />
        <path
          d="M280 405a12 12 0 1 1-13-13"
          stroke="#fff"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
