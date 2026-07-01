import { AnalyticsProcessor, AnalyticsEntry } from '../types';

const DEFAULT_SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'authorization', 'cookie',
  'creditcard', 'credit_card', 'ssn', 'api_key', 'apikey',
];

const REDACTED = '[REDACTED]';

export class SanitizationProcessor implements AnalyticsProcessor {
  readonly name = 'sanitization';
  private sensitiveFields: Set<string>;

  constructor(sensitiveFields?: string[]) {
    const fields = sensitiveFields ?? DEFAULT_SENSITIVE_FIELDS;
    this.sensitiveFields = new Set(fields.map((f) => f.toLowerCase()));
  }

  process(entry: AnalyticsEntry): AnalyticsEntry {
    return {
      ...entry,
      properties: this.redactObject(entry.properties),
      userProperties: this.redactObject(entry.userProperties),
    };
  }

  private redactObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitive(key)) {
        result[key] = REDACTED;
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        result[key] = this.redactObject(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  private isSensitive(key: string): boolean {
    const lower = key.toLowerCase();
    for (const field of this.sensitiveFields) {
      if (lower.includes(field)) return true;
    }
    return false;
  }
}
