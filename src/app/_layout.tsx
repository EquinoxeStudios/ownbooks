import '@/lib/i18n';

import { Literata_400Regular, Literata_400Regular_Italic } from '@expo-google-fonts/literata';
import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  Rubik_900Black,
  useFonts,
} from '@expo-google-fonts/rubik';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { Suspense, useEffect, useState } from 'react';

import { DatabaseProvider } from '@/db/provider';
import { AuthBridge } from '@/features/auth/AuthBridge';
import { useAuthStore } from '@/features/auth/store';
import { StartupErrorBoundary, StartupIssue } from '@/features/boot/StartupIssue';
import { bootStep } from '@/lib/boot';
import { colors } from '@/ui';

void SplashScreen.preventAutoHideAsync();

/** After this long without finishing startup, show what got stuck. */
const STALL_AFTER_MS = 10_000;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_700Bold,
    Rubik_800ExtraBold,
    Rubik_900Black,
    Literata_400Regular,
    Literata_400Regular_Italic,
  });
  const status = useAuthStore((s) => s.status);
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (fontsLoaded) bootStep('fonts loaded');
    if (fontError) bootStep(`fonts failed: ${fontError.message}`);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (status !== 'loading') {
      bootStep(`ready (${status})`);
      return;
    }
    const timer = setTimeout(() => setStalled(true), STALL_AFTER_MS);
    return () => clearTimeout(timer);
  }, [status]);

  if (stalled && status === 'loading') {
    return (
      <StartupIssue
        title="OwnBooks is taking too long to start"
        onRetry={() => setStalled(false)}
      />
    );
  }

  // Fall back to system fonts rather than hanging on the splash screen.
  if (!fontsLoaded && !fontError) return null;

  return (
    <StartupErrorBoundary>
      <Suspense fallback={null}>
        <DatabaseProvider>
          <AuthBridge>
            <StatusBar style="dark" />
            <RootNavigator />
          </AuthBridge>
        </DatabaseProvider>
      </Suspense>
    </StartupErrorBoundary>
  );
}

function RootNavigator() {
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;
  const signedIn = status === 'signedIn';

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}
