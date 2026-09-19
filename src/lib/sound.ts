import { useProgress } from '@/store/progress'

/**
 * Звуки синтезируются через WebAudio, файлов нет: приложение остаётся
 * офлайновым и лёгким. Контекст создаётся лениво, на первом же клике.
 */
let ctx: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function enabled(): boolean {
  try { return useProgress.getState().settings.sound } catch { return true }
}

interface Note { f: number; at: number; dur: number; type?: OscillatorType; gain?: number }

function play(notes: Note[]) {
  if (!enabled()) return
  const a = audio()
  if (!a) return
  const t0 = a.currentTime
  for (const n of notes) {
    const osc = a.createOscillator()
    const g = a.createGain()
    osc.type = n.type ?? 'sine'
    osc.frequency.setValueAtTime(n.f, t0 + n.at)
    const peak = n.gain ?? 0.1
    g.gain.setValueAtTime(0.0001, t0 + n.at)
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.at + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.at + n.dur)
    osc.connect(g).connect(a.destination)
    osc.start(t0 + n.at)
    osc.stop(t0 + n.at + n.dur + 0.02)
  }
}

/** Короткая восходящая кварта. */
export const playCorrect = () => play([
  { f: 659.25, at: 0, dur: 0.11 },
  { f: 987.77, at: 0.075, dur: 0.16 },
])

/** Глухой нисходящий сигнал, намеренно негромкий. */
export const playWrong = () => play([
  { f: 207.65, at: 0, dur: 0.14, type: 'triangle', gain: 0.085 },
  { f: 155.56, at: 0.1, dur: 0.2, type: 'triangle', gain: 0.075 },
])

/** Арпеджио в конце урока. */
export const playFinish = () => play([
  { f: 523.25, at: 0, dur: 0.14 },
  { f: 659.25, at: 0.1, dur: 0.14 },
  { f: 783.99, at: 0.2, dur: 0.16 },
  { f: 1046.5, at: 0.32, dur: 0.3, gain: 0.11 },
])

/** Мягкий щелчок: карточка отложена в «не знал». */
export const playFlip = () => play([{ f: 392, at: 0, dur: 0.07, type: 'triangle', gain: 0.05 }])
