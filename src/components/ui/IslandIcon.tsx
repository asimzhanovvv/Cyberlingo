import { Bug, Fingerprint, Lock, Network, Radar, ShieldAlert, Smartphone, VenetianMask, Wrench } from 'lucide-react'

const map = {
  ShieldAlert, VenetianMask, Radar, Bug, Smartphone, Network, Fingerprint, Wrench, Lock,
} as const

export function IslandIcon({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const Cmp = (map as Record<string, typeof Lock>)[name] ?? ShieldAlert
  return <Cmp size={size} className={className} aria-hidden />
}
