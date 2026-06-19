export type EventType =
  | 'log'
  | 'error'
  | 'crash'
  | 'network'
  | 'performance'
  | 'navigation'
  | 'user_action'
  | 'session'
  | 'custom';

export type EventSeverity = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEventData {
  level: EventSeverity;
  message: string;
  context?: Record<string, unknown>;
  stackTrace?: string;
}

export interface ObservabilityEvent<T = Record<string, unknown>> {
  id: string;
  type: EventType;
  severity: EventSeverity;
  timestamp: number;
  sessionId: string;
  data: T;
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export function createLogEvent(
  id: string,
  sessionId: string,
  data: LogEventData,
): ObservabilityEvent<LogEventData> {
  return {
    id,
    type: 'log',
    severity: data.level,
    timestamp: Date.now(),
    sessionId,
    data,
  };
}

export function createErrorEvent(
  id: string,
  sessionId: string,
  error: Error,
  context?: Record<string, unknown>,
): ObservabilityEvent<LogEventData> {
  return {
    id,
    type: 'error',
    severity: 'error',
    timestamp: Date.now(),
    sessionId,
    data: {
      level: 'error',
      message: error.message,
      stackTrace: error.stack,
      context,
    },
  };
}
