import type { ReactNode, SVGProps } from "react";

export interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
}

function Svg({ size = 20, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconGrid(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </Svg>
  );
}

export function IconSwap(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h14" />
      <path d="M15 4l3 3-3 3" />
      <path d="M20 17H6" />
      <path d="M9 14l-3 3 3 3" />
    </Svg>
  );
}

export function IconTrendUp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </Svg>
  );
}

export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" />
    </Svg>
  );
}

export function IconChart(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3.5 3.5v17h17" />
      <path d="M8 16v-5" />
      <path d="M12.5 16V7" />
      <path d="M17 16v-8" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconPencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20l1-4.5L16.5 4a2.1 2.1 0 0 1 3 0l.5.5a2.1 2.1 0 0 1 0 3L8.5 19 4 20z" />
      <path d="M14.5 6l3 3" />
    </Svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7h16" />
      <path d="M9.5 7V4.5h5V7" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v5.5" />
      <path d="M14 11v5.5" />
    </Svg>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-3.8-3.8" />
    </Svg>
  );
}

export function IconX(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5 13l4 4L19 7" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function IconSun(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
    </Svg>
  );
}

export function IconMoon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
    </Svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9z" />
      <path d="M15 12h5v3h-5a1.5 1.5 0 0 1 0-3z" />
    </Svg>
  );
}

export function IconArrowUpRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 17L17 7" />
      <path d="M9 7h8v8" />
    </Svg>
  );
}

export function IconArrowDownRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7 7l10 10" />
      <path d="M17 9v8H9" />
    </Svg>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </Svg>
  );
}

export function IconBank(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 9.5L12 4l9 5.5" />
      <path d="M5.5 10v7" />
      <path d="M10 10v7" />
      <path d="M14 10v7" />
      <path d="M18.5 10v7" />
      <path d="M3.5 20h17" />
    </Svg>
  );
}

export function IconCoins(p: IconProps) {
  return (
    <Svg {...p}>
      <ellipse cx="9.5" cy="7" rx="6" ry="3" />
      <path d="M3.5 7v5c0 1.66 2.7 3 6 3s6-1.34 6-3V7" />
      <path d="M3.5 12v5c0 1.66 2.7 3 6 3s6-1.34 6-3v-5" />
      <path d="M20.5 9.5V15c0 1.2-1.4 2.25-3.5 2.7" />
      <path d="M20.5 9.5c0 1.3-1.6 2.4-3.8 2.8" />
    </Svg>
  );
}

export function IconAlert(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5L2.8 19.5h18.4L12 3.5z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function IconFilter(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 6h16" />
      <path d="M7 12h10" />
      <path d="M10 18h4" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v10" />
      <path d="M8 10.5l4 4 4-4" />
      <path d="M4.5 19.5h15" />
    </Svg>
  );
}

/** Marca da aplicação: monograma de barras ascendentes. */
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="10" fill="#1d6e4e" />
      <rect x="2" y="2" width="36" height="36" rx="10" stroke="#4d9e7c" strokeOpacity="0.45" />
      <path d="M11 26v-6" stroke="#aed7c1" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M18.5 26V16" stroke="#d5eadd" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M26 26V11.5" stroke="#f4f8f5" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="28.5" cy="9" r="2.4" fill="#d9a441" />
    </svg>
  );
}
