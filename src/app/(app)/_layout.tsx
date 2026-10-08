import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { cleanupStaleImports } from '@/features/import/importer';
import { colors, playerColors } from '@/ui/tokens';

export default function AppLayout() {
  const hasOtherAccounts = useAuthStore((s) => s.otherAccounts.length > 0);

  // A different account signed in on this device: offer to clean up once.
  useEffect(() => {
    if (hasOtherAccounts) router.push('/account-switch');
  }, [hasOtherAccounts]);

  // Remove half-copied files if the app was killed during an import.
  useEffect(() => {
    cleanupStaleImports();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="player"
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
          contentStyle: { backgroundColor: playerColors.bg },
        }}
      />
      <Stack.Screen name="import" options={{ gestureEnabled: false }} />
      <Stack.Screen name="import-done" options={{ gestureEnabled: false, animation: 'fade' }} />
      <Stack.Screen
        name="account-switch"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 28,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
