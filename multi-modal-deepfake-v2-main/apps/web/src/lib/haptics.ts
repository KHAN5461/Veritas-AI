/**
 * Cyber-Forensic Haptic Feedback Engine
 * Provides subtle, tactile feedback on modern mobile devices (Android, ChromeOS, supported WebKit).
 */

export function triggerHaptic(pattern: number | number[]) {
  if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}

/** Subtle tick on button taps, file selection, or tab switches (15ms) */
export function hapticLight() {
  triggerHaptic(15);
}

/** Tactile double-tap for authentic media verification or report saves ([25ms, 40ms, 25ms]) */
export function hapticSuccess() {
  triggerHaptic([25, 40, 25]);
}

/** Distinct pulsating alert pattern for synthetic media / deepfake detections ([80ms, 50ms, 80ms]) */
export function hapticWarning() {
  triggerHaptic([80, 50, 80]);
}

/** Error or rejected upload pattern ([100ms, 60ms, 100ms]) */
export function hapticError() {
  triggerHaptic([100, 60, 100]);
}
