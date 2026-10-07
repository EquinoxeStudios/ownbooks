import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { CryptoDigestAlgorithm, digestStringAsync, randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';

/** i18n keys under auth.* for errors shown to the user. */
export type AuthErrorKey =
  | 'errors.offline'
  | 'errors.notConfigured'
  | 'errors.providerUnavailable'
  | 'errors.rateLimited'
  | 'errors.generic'
  | 'verify.invalid';

export class AuthFlowError extends Error {
  constructor(public readonly key: AuthErrorKey, cause?: unknown) {
    super(key, { cause });
  }
}

/** Thrown when the user backs out of a native sign-in sheet. Not an error to show. */
export class AuthCancelled extends Error {}

function client() {
  if (!supabase) throw new AuthFlowError('errors.notConfigured');
  return supabase;
}

export function toAuthError(error: unknown, fallback: AuthErrorKey = 'errors.generic'): AuthFlowError {
  if (error instanceof AuthFlowError) return error;
  if (isAuthRetryableFetchError(error)) return new AuthFlowError('errors.offline', error);
  if (isAuthApiError(error)) {
    if (error.status === 429) return new AuthFlowError('errors.rateLimited', error);
    if (error.code === 'otp_expired' || error.code === 'invalid_credentials') {
      return new AuthFlowError('verify.invalid', error);
    }
  }
  if (error instanceof TypeError && /network/i.test(error.message)) {
    return new AuthFlowError('errors.offline', error);
  }
  return new AuthFlowError(fallback, error);
}

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw toAuthError(error);
}

export async function verifyEmailCode(email: string, token: string): Promise<void> {
  const { error } = await client().auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw toAuthError(error, 'verify.invalid');
}

export const isAppleSignInSupported = Platform.OS === 'ios';
export const isGoogleSignInConfigured = Boolean(
  env.googleWebClientId && (Platform.OS !== 'ios' || env.googleIosClientId),
);

export async function signInWithApple(): Promise<void> {
  const auth = client();
  // Apple gets the SHA-256 of the nonce; Supabase verifies it against the raw value.
  const rawNonce = randomUUID();
  const hashedNonce = await digestStringAsync(CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') throw new AuthCancelled();
    throw toAuthError(e);
  }
  if (!credential.identityToken) throw new AuthFlowError('errors.generic');

  const { error } = await auth.auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) throw toAuthError(error);

  // Apple only shares the name on the very first authorization.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
    .filter(Boolean)
    .join(' ');
  if (fullName) await auth.auth.updateUser({ data: { full_name: fullName } });
}

export async function signInWithGoogle(): Promise<void> {
  const auth = client();
  if (!isGoogleSignInConfigured) throw new AuthFlowError('errors.providerUnavailable');
  // Loaded lazily: the native module isn't present until Google sign-in is configured.
  const { GoogleSignin, isSuccessResponse, isErrorWithCode, statusCodes } = await import(
    '@react-native-google-signin/google-signin'
  );
  GoogleSignin.configure({
    webClientId: env.googleWebClientId,
    iosClientId: env.googleIosClientId,
  });
  let idToken: string | null = null;
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) throw new AuthCancelled();
    idToken = response.data.idToken;
  } catch (e) {
    if (e instanceof AuthCancelled) throw e;
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) throw new AuthCancelled();
    throw toAuthError(e);
  }
  if (!idToken) throw new AuthFlowError('errors.generic');
  const { error } = await auth.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw toAuthError(error);
}

/** Signs this device out only. Local files stay; the library is hidden until sign-in. */
export async function signOutRemote(): Promise<void> {
  if (!supabase) return;
  // Even if the network call fails, the local session is cleared.
  await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
}
