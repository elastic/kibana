/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esqlFieldName, esqlStringLiteral, type QueryTemplate } from '../models/query_codec';
import type { GeneratedTemplate } from '../templates/deduplicate_templates';
import { templateIdentity } from '../templates/template_identity';
import type { TemplateGenerationContext } from '../logging/generate_log_templates';
import type { OtelSignal } from '../models/otel_signal_codec';

/** Conventional catch-all trace source; consuming agents narrow it to their deployment. */
const TRACE_SOURCE = 'traces*';
/** Conventional catch-all metrics source; consuming agents narrow it to their deployment. */
const METRIC_SOURCE = 'metrics*';
/** Default percentile used by latency, attribute, and histogram aggregations. */
const PERCENTILE = 95;
/**
 * Final key segments that name payment or credential data, which must not become catalog queries.
 * Stopgap: replace with a dedicated sensitive-attribute finding once one exists.
 */
const sensitiveAttributeKeyPattern: RegExp =
  /(?:^|_)(?:card_number|cvv|cvc|pan|ssn|password|secret|token|api_key)$/;

/** Returns whether an attribute key names payment or credential data across dot, dash, and camelCase styles. */
const isSensitiveAttributeKey = (key: string): boolean =>
  sensitiveAttributeKeyPattern.test(
    key
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[.-]/g, '_')
      .toLowerCase()
  );

/** Constructs generated template metadata from a codec-compatible pure template. */
const generatedTemplate = ({
  context,
  logLevel,
  severityScore,
  template,
}: {
  readonly context: TemplateGenerationContext;
  readonly logLevel?: string;
  readonly severityScore?: number;
  readonly template: QueryTemplate;
}): GeneratedTemplate => ({
  ...template,
  ...context,
  id: templateIdentity({ ...context, query: template.query, signalType: template.signalType }),
  ...(logLevel === undefined ? {} : { logLevel }),
  ...(severityScore === undefined ? {} : { severityScore }),
});

/** Returns the metric aggregation selected by the extracted instrument kind. */
const metricStats = (
  metricKind: NonNullable<OtelSignal['metricKind']>,
  metricField: string
): string => {
  switch (metricKind) {
    case 'counter':
      return `rate = SUM(RATE(${metricField}))`;
    case 'histogram':
      return `p95 = AVG(PERCENTILE_OVER_TIME(${metricField}, ${PERCENTILE}))`;
    case 'gauge':
    case 'updown':
      return `avg = AVG(AVG_OVER_TIME(${metricField}))`;
  }
};

/** Builds all supported literal OTel query families and retains dynamic signals for upstream evidence only. */
export const generateOtelTemplates = ({
  context,
  signals,
}: {
  readonly context: TemplateGenerationContext;
  readonly signals: readonly OtelSignal[];
}): readonly GeneratedTemplate[] =>
  signals.flatMap((signal) => {
    // Dynamic names intentionally remain on the extracted signal and never become invented literal queries.
    if (signal.templated) return [];
    switch (signal.kind) {
      case 'span_name': {
        if (signal.value === undefined || signal.value.length === 0) return [];
        /** Holds the source-derived static span name. */
        const value: string = signal.value;
        /** Renders the extracted operation name as an inline ES|QL string literal. */
        const spanNameLiteral: string = esqlStringLiteral(value);
        /** Defines the span-name count and error template. */
        const counts: QueryTemplate = {
          description: 'Counts a source-instrumented span and its error outcomes.',
          evidence: signal.evidence,
          query: `FROM ${TRACE_SOURCE}\n| WHERE name == ${spanNameLiteral}\n| STATS total = COUNT(*), errors = COUNT(*) WHERE status.code == "Error"`,
          signalType: 'trace',
          title: `Span outcomes: ${value}`,
        };
        /** Defines the span latency percentile template. */
        const latency: QueryTemplate = {
          ...counts,
          description: 'Calculates latency for a source-instrumented span.',
          query: `FROM ${TRACE_SOURCE}\n| WHERE name == ${spanNameLiteral}\n| STATS p95_latency = PERCENTILE(duration, ${PERCENTILE})`,
          title: `Span latency: ${value}`,
        };
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: counts,
          }),
          generatedTemplate({
            context,
            severityScore: 50,
            template: latency,
          }),
        ];
      }
      case 'event_name': {
        if (signal.value === undefined || signal.value.length === 0) return [];
        /** Holds the source-derived static event name. */
        const value: string = signal.value;
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: {
              description: 'Finds a source-instrumented OpenTelemetry event by name.',
              evidence: signal.evidence,
              query: `FROM ${TRACE_SOURCE}\n| WHERE event.name == ${esqlStringLiteral(value)}`,
              signalType: 'trace',
              title: `Event: ${value}`,
            },
          }),
        ];
      }
      case 'attr_key': {
        if (signal.value === undefined || signal.value.length === 0) return [];
        if (isSensitiveAttributeKey(signal.value)) return [];
        /** Holds the source-derived static attribute key. */
        const value: string = signal.value;
        /** Inlines the source-derived key as a field reference, quoted only when ES|QL requires it. */
        const field: string = esqlFieldName(`attributes.${value}`);
        /** Builds a boolean, numeric, or grouping family from the extracted value hint. */
        const query: string =
          signal.valueHint === 'bool'
            ? `FROM ${TRACE_SOURCE}\n| WHERE ${field} == true`
            : signal.valueHint === 'number'
            ? `FROM ${TRACE_SOURCE}\n| WHERE ${field} IS NOT NULL\n| STATS avg = AVG(${field}), max = MAX(${field}), p95 = PERCENTILE(${field}, ${PERCENTILE})`
            : `FROM ${TRACE_SOURCE}\n| WHERE ${field} IS NOT NULL\n| STATS count = COUNT(*) BY ${field}`;
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: {
              description: 'Analyzes a source-instrumented OpenTelemetry attribute.',
              evidence: signal.evidence,
              query,
              signalType: 'trace',
              title: `Attribute: ${value}`,
            },
          }),
        ];
      }
      case 'metric_name': {
        if (
          signal.value === undefined ||
          signal.value.length === 0 ||
          signal.metricKind === undefined
        )
          return [];
        /** Holds the source-derived static metric name. */
        const value: string = signal.value;
        /** Inlines the source-derived name as a field reference, quoted only when ES|QL requires it. */
        const field: string = esqlFieldName(`metrics.${value}`);
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: {
              description:
                'Aggregates a source-instrumented OpenTelemetry metric using its instrument family.',
              evidence: signal.evidence,
              query: `TS ${METRIC_SOURCE}\n| WHERE ${field} IS NOT NULL\n| STATS ${metricStats(
                signal.metricKind,
                field
              )}`,
              signalType: 'metric',
              title: `Metric: ${value}`,
            },
          }),
        ];
      }
      case 'error_status':
        return [
          generatedTemplate({
            context,
            severityScore: 80,
            template: {
              description: 'Counts OpenTelemetry trace records with an error status.',
              evidence: signal.evidence,
              query: `FROM ${TRACE_SOURCE}\n| WHERE status.code == "Error"\n| STATS count = COUNT(*) BY name`,
              signalType: 'trace',
              title: 'OpenTelemetry error status',
            },
          }),
        ];
      case 'record_exception':
        return [
          generatedTemplate({
            context,
            severityScore: 80,
            template: {
              description: 'Groups recorded OpenTelemetry exceptions by exception type.',
              evidence: signal.evidence,
              query: `FROM ${TRACE_SOURCE}\n| WHERE attributes.exception.type IS NOT NULL\n| STATS count = COUNT(*) BY attributes.exception.type`,
              signalType: 'trace',
              title: 'Recorded OpenTelemetry exceptions',
            },
          }),
        ];
    }
  });
