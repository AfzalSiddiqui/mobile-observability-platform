import { DetectedAnomaly, MetricSnapshot, AIAnalysisResult } from '../types';

const MAX_CONSECUTIVE_FAILURES = 3;
const CIRCUIT_BREAKER_BACKOFF_MS = 5 * 60 * 1000; // 5 minutes

export class AIDetector {
  private readonly apiKey: string | undefined;
  private readonly model: string;

  private consecutiveFailures = 0;
  private circuitOpenUntil = 0;

  constructor(apiKey: string | undefined, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  async analyze(
    anomalies: DetectedAnomaly[],
    snapshot: MetricSnapshot,
  ): Promise<AIAnalysisResult | null> {
    if (!this.apiKey) {
      return null;
    }

    if (this.isCircuitOpen()) {
      return null;
    }

    try {
      const result = await this.callClaudeAPI(anomalies, snapshot);
      this.consecutiveFailures = 0;
      return result;
    } catch {
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        this.circuitOpenUntil = Date.now() + CIRCUIT_BREAKER_BACKOFF_MS;
      }
      return null;
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey && !this.isCircuitOpen();
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  private isCircuitOpen(): boolean {
    if (this.circuitOpenUntil === 0) {
      return false;
    }
    if (Date.now() >= this.circuitOpenUntil) {
      // Half-open: allow one attempt
      this.circuitOpenUntil = 0;
      this.consecutiveFailures = 0;
      return false;
    }
    return true;
  }

  private async callClaudeAPI(
    anomalies: DetectedAnomaly[],
    snapshot: MetricSnapshot,
  ): Promise<AIAnalysisResult> {
    const prompt = this.buildPrompt(anomalies, snapshot);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as { content?: { text?: string }[] };
    const text = data.content?.[0]?.text;

    if (!text) {
      throw new Error('Empty response from Claude API');
    }

    return this.parseResponse(text);
  }

  private buildPrompt(anomalies: DetectedAnomaly[], snapshot: MetricSnapshot): string {
    const anomalyDescriptions = anomalies
      .map(
        (a) =>
          `- ${a.anomalyType}: metric "${a.metricName}" is ${a.currentValue} (baseline mean: ${a.baselineMean}, z-score: ${a.zScore.toFixed(2)})`,
      )
      .join('\n');

    return `You are a mobile app observability expert. Analyze the following anomalies detected in a mobile application's telemetry data.

Current metric snapshot:
- Error count: ${snapshot.errorCount}
- Total event count: ${snapshot.totalEventCount}
- Avg performance duration: ${isNaN(snapshot.avgPerformanceDuration) ? 'N/A' : snapshot.avgPerformanceDuration.toFixed(2) + 'ms'}
- Event types: ${JSON.stringify(snapshot.perTypeCount)}

Detected anomalies:
${anomalyDescriptions}

Respond ONLY with valid JSON in this exact format (no markdown, no code fences):
{
  "explanation": "A brief human-readable explanation of what is happening",
  "severity": "low|medium|high|critical",
  "rootCause": "Most likely root cause",
  "recommendations": ["Action item 1", "Action item 2"]
}`;
  }

  private parseResponse(text: string): AIAnalysisResult {
    try {
      const parsed = JSON.parse(text);
      return {
        explanation: String(parsed.explanation ?? 'Unknown anomaly detected'),
        severity: String(parsed.severity ?? 'medium'),
        rootCause: String(parsed.rootCause ?? 'Unknown'),
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.map(String)
          : [],
      };
    } catch {
      // If JSON parsing fails, use the raw text as the explanation
      return {
        explanation: text,
        severity: 'medium',
        rootCause: 'Unable to parse structured response',
        recommendations: [],
      };
    }
  }
}
