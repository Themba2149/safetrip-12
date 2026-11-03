// Helpers for the face / fingerprint unlock. The browser asks the device to check the person.
// SafeTrip never receives or stores a face or fingerprint. Pure functions, easy to test.

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** One unlock setting per driver, kept on this device only. */
export function unlockStorageKey(userId: string): string {
  return `safetrip.deviceUnlock.${userId}`
}