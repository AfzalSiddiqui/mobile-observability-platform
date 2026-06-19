/**
 * TurboModule spec for ObservabilityLogger native module.
 * Compatible with React Native's codegen for both old and new architecture.
 *
 * Note: When used in a React Native project with codegen enabled,
 * this file should import TurboModule from 'react-native'.
 * The interface is defined standalone here to avoid hard dependency.
 */
export interface NativeLogModuleSpec {
  startCapture(options: { level: string }): void;
  stopCapture(): void;
}
