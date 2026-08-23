/**
 * Real-time audio level store driven by RTC's volume-indicator events.
 *
 * Speaking indicators read levels imperatively inside requestAnimationFrame,
 * so high-frequency volume updates never trigger React re-renders.
 */
const levels = new Map<string, number>();

export function setAudioLevel(uid: string, level: number): void {
  levels.set(String(uid), level);
}

export function removeUid(uid: string): void {
  levels.delete(String(uid));
}

export function getAudioLevel(uid: string): number {
  return Math.min(1, levels.get(String(uid)) ?? 0);
}
