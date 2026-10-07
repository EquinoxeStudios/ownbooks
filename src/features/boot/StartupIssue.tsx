import * as SplashScreen from 'expo-splash-screen';
import { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { bootStep, bootSteps } from '@/lib/boot';
import { colors } from '@/ui/tokens';

type StartupIssueProps = {
  title: string;
  error?: Error | null;
  onRetry?: () => void;
};

/**
 * Plain fallback screen for launch failures. Uses only system fonts and no
 * i18n so it renders even when those are what failed.
 */
export function StartupIssue({ title, error, onRetry }: StartupIssueProps) {
  useEffect(() => {
    void SplashScreen.hideAsync().catch(() => undefined);
  }, []);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.body}>
          Please send a screenshot of this screen to the OwnBooks team.
        </Text>
        {error ? (
          <Text selectable style={styles.mono}>
            {`${error.name}: ${error.message}\n\n${(error.stack ?? '').split('\n').slice(0, 12).join('\n')}`}
          </Text>
        ) : null}
        <Text style={styles.label}>Startup steps</Text>
        <Text selectable style={styles.mono}>
          {bootSteps().join('\n')}
        </Text>
        {onRetry ? (
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
            <Text style={styles.buttonText}>Try again</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

type BoundaryState = { error: Error | null };

/** Catches errors thrown while the app starts (database, auth, fonts). */
export class StartupErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    bootStep(`error: ${error.message}`);
    console.error('Startup failed', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <StartupIssue
          title="OwnBooks couldn’t start"
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 72, gap: 12 },
  title: { fontSize: 26, fontWeight: '800', color: colors.ink },
  body: { fontSize: 16, color: colors.muted },
  label: { fontSize: 14, fontWeight: '700', color: colors.ink, marginTop: 8 },
  mono: { fontFamily: 'monospace', fontSize: 12, color: colors.ink },
  button: {
    marginTop: 16,
    height: 52,
    borderRadius: 20,
    backgroundColor: colors.inkButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontSize: 17, fontWeight: '700' },
});
