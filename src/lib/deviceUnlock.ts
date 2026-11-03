import { fromBase64Url, toBase64Url, unlockStorageKey } from '../data/unlock'

/** True when this device and browser can check the person with face, fingerprint or the device PIN. */
export async function deviceUnlockSupported(): Promise<boolean> {
  try {
    if (!window.isSecureContext || !window.PublicKeyCredential) return false
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

export function isUnlockEnabled(userId: string): boolean {
  try {
    return window.localStorage.getItem(unlockStorageKey(userId)) !== null
  } catch {
    return false
  }
}

function friendly(error: unknown): string {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError') return 'The check was cancelled or not recognised. Try again.'
  if (name === 'InvalidStateError') return 'This device is already set up. Turn the unlock off and on again.'
  return 'This device could not do the check. Try again, or turn the unlock off.'
}

/** Sets up face or fingerprint unlock on this device. Returns an error message, or '' on success. */
export async function enableDeviceUnlock(userId: string, label: string): Promise<string> {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'SafeTrip' },
        user: { id: new TextEncoder().encode(userId), name: label, displayName: label },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },
          { type: 'public-key', alg: -257 },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged',
        },
        timeout: 60_000,
        attestation: 'none',
      },
    })
    if (!(credential instanceof PublicKeyCredential)) return 'This device could not be set up.'
    window.localStorage.setItem(unlockStorageKey(userId), toBase64Url(new Uint8Array(credential.rawId)))
    return ''
  } catch (error) {
    return friendly(error)
  }
}

/** Asks the device to check the person. Returns an error message, or '' when they are recognised. */
export async function verifyDeviceUnlock(userId: string): Promise<string> {
  try {
    const stored = window.localStorage.getItem(unlockStorageKey(userId))
    if (!stored) return 'Unlock is not set up on this device.'
    await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{ type: 'public-key', id: fromBase64Url(stored), transports: ['internal'] }],
        userVerification: 'required',
        timeout: 60_000,
      },
    })
    return ''
  } catch (error) {
    return friendly(error)
  }
}

export function disableDeviceUnlock(userId: string): void {
  try {
    window.localStorage.removeItem(unlockStorageKey(userId))
  } catch {
    // Storage can be blocked. Nothing else to clean up.
  }
}