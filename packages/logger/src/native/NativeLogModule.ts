import type { TurboModule } from 'react-native';

/**
 * TurboModule spec for ObservabilityLogger native module.
 * Compatible with React Native's codegen for both old and new architecture.
 */
export interface Spec extends TurboModule {
  startCapture(options: { level: string }): void;
  stopCapture(): void;
}
