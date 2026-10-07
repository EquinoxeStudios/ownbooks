/**
 * Startup breadcrumbs. If launch fails or stalls, the startup issue screen
 * shows these so a tester can report exactly where it stopped.
 */
const start = Date.now();
const steps: string[] = [];

export function bootStep(step: string): void {
  steps.push(`${Date.now() - start} ms  ${step}`);
}

export function bootSteps(): readonly string[] {
  return steps;
}

bootStep('JavaScript loaded');
