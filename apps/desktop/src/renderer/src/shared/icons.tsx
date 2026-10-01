import type { ReactNode } from "react";

function Icon({ className = "h-4 w-4", children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { className?: string };

export const MicIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <path d="M12 19v3" />
  </Icon>
);

export const HomeIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Icon>
);

export const HistoryIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);

export const BookIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
  </Icon>
);

export const SettingsIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
    <circle cx="15" cy="6" r="2" />
    <circle cx="9" cy="12" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Icon>
);

export const PlayIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M7 4.5v15l12-7.5Z" fill="currentColor" />
  </Icon>
);

export const PauseIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M8 5v14M16 5v14" strokeWidth={3} />
  </Icon>
);

export const TrashIcon = ({ className }: IconProps) => (
  <Icon className={className}>
    <path d="M3 6h18" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);
