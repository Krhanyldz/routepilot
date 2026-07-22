import type { SVGProps } from "react";
import type { TransportMode } from "@/domain/models";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg>;
}

export function PlaneIcon(props: IconProps) { return <Icon {...props}><path d="m3 11 18-7-7 18-3-8-8-3Z"/><path d="m11 14 4-4"/></Icon>; }
export function TrainIcon(props: IconProps) { return <Icon {...props}><rect x="5" y="3" width="14" height="14" rx="3"/><path d="M8 21l3-4m5 4-3-4M8 8h8M8 12h.01M16 12h.01"/></Icon>; }
export function FerryIcon(props: IconProps) { return <Icon {...props}><path d="M4 15 6 5h12l2 10-8 5-8-5Z"/><path d="M8 9h8M2 21c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/></Icon>; }
export function PinIcon(props: IconProps) { return <Icon {...props}><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></Icon>; }
export function CalendarIcon(props: IconProps) { return <Icon {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></Icon>; }
export function SearchIcon(props: IconProps) { return <Icon {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></Icon>; }
export function ArrowIcon(props: IconProps) { return <Icon {...props}><path d="M5 12h14m-5-5 5 5-5 5"/></Icon>; }
export function MoonIcon(props: IconProps) { return <Icon {...props}><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/></Icon>; }
export function SunIcon(props: IconProps) { return <Icon {...props}><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></Icon>; }
export function SlidersIcon(props: IconProps) { return <Icon {...props}><path d="M4 6h16M4 18h16M8 3v6m8 6v6"/></Icon>; }
export function ShieldIcon(props: IconProps) { return <Icon {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/></Icon>; }

export function TransportIcon({ mode, ...props }: IconProps & { mode: TransportMode }) {
  if (mode === "flight") return <PlaneIcon {...props} />;
  if (mode === "train") return <TrainIcon {...props} />;
  return <FerryIcon {...props} />;
}
