import { router, Stack } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/features/auth/store';
import { colors } from '@/ui';

export default function AppLayout() {
  const hasOtherAccounts = useAuthStore((s) => s.otherAccounts.length > 0);

  // A different account signed in on this device: offer to clean up once.
  useEffect(() => {
    if (hasOtherAccounts) router.push('/account-switch');
  }, [hasOtherAccounts]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="(tabs)" />
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
