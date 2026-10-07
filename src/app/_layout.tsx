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
import { Suspense, useEffect } from 'react';

import { DatabaseProvider } from '@/db/provider';
import { AuthBridge } from '@/features/auth/AuthBridge';
import { useAuthStore } from '@/features/auth/store';
import { colors } from '@/ui';

void SplashScreen.preventAutoHideAsync();

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

  // Fall back to system fonts rather than hanging on the splash screen.
  if (!fontsLoaded && !fontError) return null;

  return (
    <Suspense fallback={null}>
      <DatabaseProvider>
        <AuthBridge>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthBridge>
      </DatabaseProvider>
    </Suspense>
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
