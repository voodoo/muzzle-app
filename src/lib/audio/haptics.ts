// Optional haptic-only confirmations (PRD 5.4) so the user doesn't need to look
// at the screen. No-op where the Vibration API is unavailable (e.g. iOS Safari).

export function haptic(pattern: number | number[]): void {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      /* unsupported / blocked */
    }
  }
}

export const HAPTIC_START = 30;
export const HAPTIC_STOP: number[] = [15, 40, 15];
