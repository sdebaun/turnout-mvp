// Barrel export for auth library — import from '@/lib/auth' for convenience
export {
  checkPhoneExists,
  createUserWithCredential,
  getCredentialByPhone,
} from './users'

export {
  checkRateLimit,
  incrementRateLimit,
  sendOTPCode,
  checkOTPCode,
  type RateLimitError,
  type OTPError,
} from './otp'

export {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  getUser,
} from './sessions'
