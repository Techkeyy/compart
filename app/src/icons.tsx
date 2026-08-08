import type { ReactNode } from "react";

export type IconProps = { size?: number; className?: string };

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none">{children}</svg>;
}

export function LockIcon(props: IconProps) {
  return <Svg {...props}><rect x="5" y="10" width="14" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="15" r="1.2" fill="currentColor" /></Svg>;
}

export function UsersIcon(props: IconProps) {
  return <Svg {...props}><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19c.4-3.5 2.2-5.3 5.5-5.3s5.1 1.8 5.5 5.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /><path d="M15.5 6.2a2.7 2.7 0 0 1 0 5.2M16.5 14c2.3.5 3.6 2.2 3.9 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></Svg>;
}

export function CheckIcon(props: IconProps) {
  return <Svg {...props}><path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function ArrowIcon(props: IconProps) {
  return <Svg {...props}><path d="M5 12h13M14 7l5 5-5 5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function PlusIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" /></Svg>;
}

export function KeyIcon(props: IconProps) {
  return <Svg {...props}><circle cx="8.5" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.8" /><path d="M13 12h7m-2 0v3m-3-3v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></Svg>;
}

export function ShieldIcon(props: IconProps) {
  return <Svg {...props}><path d="M12 3 19 6v5c0 4.6-2.5 7.7-7 10-4.5-2.3-7-5.4-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.8" /><path d="m8.7 12 2.1 2.1 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

export function CalendarIcon(props: IconProps) {
  return <Svg {...props}><rect x="4" y="6" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.8" /><path d="M8 3v5m8-5v5M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></Svg>;
}

export function ReceiptIcon(props: IconProps) {
  return <Svg {...props}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></Svg>;
}

export function WalletIcon(props: IconProps) {
  return <Svg {...props}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v12H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.8" /><path d="M16 11h4v4h-4a2 2 0 1 1 0-4Z" stroke="currentColor" strokeWidth="1.8" /></Svg>;
}

export function HomeIcon(props: IconProps) {
  return <Svg {...props}><path d="m3 11 9-7 9 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M5.5 10v10h13V10M9 20v-6h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></Svg>;
}

export function BuildingIcon(props: IconProps) {
  return <Svg {...props}><path d="M5 21V5l7-2v18M12 8h7v13M3 21h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M8 8h1m-1 4h1m-1 4h1m6-4h1m-1 4h1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></Svg>;
}

export function CopyIcon(props: IconProps) {
  return <Svg {...props}><rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.8" /></Svg>;
}

export function SparkIcon(props: IconProps) {
  return <Svg {...props}><path d="m12 3 1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /><path d="m18 16 .7 2.3L21 19l-2.3.7L18 22l-.7-2.3L15 19l2.3-.7L18 16Z" fill="currentColor" /></Svg>;
}
