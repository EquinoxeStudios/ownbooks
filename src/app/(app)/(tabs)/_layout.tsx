import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { colors } from '@/ui';
import { TabBar } from '@/ui/components/TabBar';

export default function TabsLayout() {
  const { t } = useTranslation();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="library" options={{ title: t('tabs.library') }} />
      <Tabs.Screen name="activity" options={{ title: t('tabs.activity') }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile') }} />
    </Tabs>
  );
}
