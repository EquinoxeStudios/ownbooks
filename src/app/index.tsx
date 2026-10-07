import { Redirect } from 'expo-router';

import { useAuthStore } from '@/features/auth/store';

/** Entry point: picks onboarding, sign-in or the library. */
export default function Index() {
  const status = useAuthStore((s) => s.status);
  const onboardingDone = useAuthStore((s) => s.onboardingDone);

  if (status === 'signedIn') return <Redirect href="/library" />;
  if (!onboardingDone) return <Redirect href="/welcome" />;
  return <Redirect href={{ pathname: '/sign-in', params: { returning: '1' } }} />;
}
