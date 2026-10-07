import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { EMAIL_PATTERN, sendEmailCode } from '@/features/auth/providers';
import { useAuthAction } from '@/features/auth/useAuthAction';
import { BackHeader, Button, ErrorText, Screen, Text, TextField } from '@/ui';

export default function EmailEntry() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const { busy, error, run } = useAuthAction();

  const submit = async () => {
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setInvalid(true);
      return;
    }
    const ok = await run('send', () => sendEmailCode(value));
    if (ok) router.push({ pathname: '/verify', params: { email: value } });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen
        footer={
          <>
            {error ? <ErrorText message={error} /> : null}
            <Button label={t('auth.email.send')} loading={busy === 'send'} onPress={submit} />
          </>
        }>
        <BackHeader />
        <View style={styles.copy}>
          <Text variant="h1" accessibilityRole="header">
            {t('auth.email.title')}
          </Text>
          <Text variant="lead">{t('auth.email.lead')}</Text>
        </View>
        <TextField
          label={t('auth.email.label')}
          placeholder={t('auth.email.placeholder')}
          value={email}
          onChangeText={(v) => {
            setEmail(v);
            setInvalid(false);
          }}
          error={invalid ? t('auth.email.invalid') : null}
          autoFocus
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={submit}
        />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  copy: { gap: 12 },
});
