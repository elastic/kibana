/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderQueryParameter,
  type QueryParameter,
  type QueryTemplate,
} from '../models/query_codec';
import type { GeneratedTemplate } from '../templates/deduplicate_templates';
import { semanticDigest, templateIdentity } from '../templates/template_identity';
import type { TemplateGenerationContext } from '../logging/generate_log_templates';
import type { OtelSignal } from '../models/otel_signal_codec';

/** Parameterizes the target trace, log, or metrics source instead of selecting a deployment-specific stream. */
const sourceParameter = (signalType: QueryTemplate['signalType']): QueryParameter => ({
  description: `Source or index pattern containing OpenTelemetry ${signalType} records.`,
  example:
    signalType === 'metric'
      ? 'metrics-application-*'
      : signalType === 'trace'
      ? 'traces-application-*'
      : 'logs-application-*',
  kind: 'source',
  name: 'source',
});

/** Builds one identifier parameter whose example came from a static source literal and must be escaped. */
const identifierParameter = (
  name: string,
  description: string,
  example: string
): QueryParameter => ({
  description,
  example,
  kind: 'identifier',
  name,
});

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

/** Returns the metric aggregation selected by the extracted instrument kind and its semantic field placeholder. */
const metricStats = (
  metricKind: NonNullable<OtelSignal['metricKind']>,
  metricField: string
): string => {
  switch (metricKind) {
    case 'counter':
      return `rate = SUM(RATE([[${metricField}]]))`;
    case 'histogram':
      return `p95 = AVG(PERCENTILE_OVER_TIME([[${metricField}]], [[percentile]]))`;
    case 'gauge':
    case 'updown':
      return `avg = AVG(AVG_OVER_TIME([[${metricField}]]))`;
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
        const spanNameLiteral: string = renderQueryParameter({
          description: 'Inline OpenTelemetry span operation name.',
          example: value,
          kind: 'string',
          name: 'span_name',
        });
        /** Defines the span-name count and error template. */
        const counts: QueryTemplate = {
          description: 'Counts a source-instrumented span and its error outcomes.',
          evidence: signal.evidence,
          parameters: {
            source: sourceParameter('trace'),
            span_name_field: identifierParameter(
              'span_name_field',
              'Field containing the OpenTelemetry span operation name.',
              'name'
            ),
            status_field: identifierParameter(
              'status_field',
              'Field containing the OpenTelemetry status code.',
              'status.code'
            ),
          },
          query: `FROM [[source]]\n| WHERE [[span_name_field]] == ${spanNameLiteral}\n| STATS total = COUNT(*), errors = COUNT(*) WHERE [[status_field]] == "Error"`,
          signalType: 'trace',
          title: `Span outcomes: ${value}`,
        };
        /** Defines the span latency percentile template. */
        const latency: QueryTemplate = {
          ...counts,
          description: 'Calculates latency for a source-instrumented span.',
          query: `FROM [[source]]\n| WHERE [[span_name_field]] == ${spanNameLiteral}\n| STATS p95_latency = PERCENTILE([[duration_field]], [[percentile]])`,
          parameters: {
            source: sourceParameter('trace'),
            span_name_field: identifierParameter(
              'span_name_field',
              'Field containing the OpenTelemetry span operation name.',
              'name'
            ),
            duration_field: identifierParameter(
              'duration_field',
              'Field containing the OpenTelemetry span duration.',
              'duration'
            ),
            percentile: {
              description: 'Latency percentile to calculate.',
              example: 95,
              kind: 'number',
              name: 'percentile',
            },
          },
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
        /** Renders the extracted event name as an inline ES|QL string literal. */
        const eventNameLiteral: string = renderQueryParameter({
          description: 'Inline OpenTelemetry event name.',
          example: value,
          kind: 'string',
          name: 'event_name',
        });
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: {
              description: 'Finds a source-instrumented OpenTelemetry event by name.',
              evidence: signal.evidence,
              parameters: {
                event_name_field: identifierParameter(
                  'event_name_field',
                  'Field containing the OpenTelemetry event name.',
                  'event.name'
                ),
                source: sourceParameter('trace'),
              },
              query: `FROM [[source]]\n| WHERE [[event_name_field]] == ${eventNameLiteral}`,
              signalType: 'trace',
              title: `Event: ${value}`,
            },
          }),
        ];
      }
      case 'attr_key': {
        if (signal.value === undefined || signal.value.length === 0) return [];
        /** Holds the source-derived static attribute key. */
        const value: string = signal.value;
        /** Makes the source-derived key part of query identity while retaining a configurable field parameter. */
        const attributeFieldName: string = `attribute_field_${semanticDigest(value)}`;
        /** Builds a boolean, numeric, or grouping family from the extracted value hint. */
        const query: string =
          signal.valueHint === 'bool'
            ? `FROM [[source]]\n| WHERE [[${attributeFieldName}]] == [[attribute_value]]`
            : signal.valueHint === 'number'
            ? `FROM [[source]]\n| WHERE [[${attributeFieldName}]] IS NOT NULL\n| STATS avg = AVG([[${attributeFieldName}]]), max = MAX([[${attributeFieldName}]]), p95 = PERCENTILE([[${attributeFieldName}]], [[percentile]])`
            : `FROM [[source]]\n| WHERE [[${attributeFieldName}]] IS NOT NULL\n| STATS count = COUNT(*) BY [[${attributeFieldName}]]`;
        /** Provides only the parameters used by the selected attribute query family. */
        const parameters: Record<string, QueryParameter> = {
          [attributeFieldName]: identifierParameter(
            attributeFieldName,
            'Field containing the OpenTelemetry attribute.',
            `attributes.${value}`
          ),
          source: sourceParameter('trace'),
        };
        if (signal.valueHint === 'bool') {
          parameters.attribute_value = {
            description: 'Boolean attribute value to match.',
            example: false,
            kind: 'boolean',
            name: 'attribute_value',
          };
        }
        if (signal.valueHint === 'number') {
          parameters.percentile = {
            description: 'Attribute percentile to calculate.',
            example: 95,
            kind: 'number',
            name: 'percentile',
          };
        }
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: {
              description: 'Analyzes a source-instrumented OpenTelemetry attribute.',
              evidence: signal.evidence,
              parameters,
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
        /** Makes the source-derived name part of query identity while retaining a configurable field parameter. */
        const metricFieldName: string = `metric_field_${semanticDigest(value)}`;
        return [
          generatedTemplate({
            context,
            severityScore: 50,
            template: {
              description:
                'Aggregates a source-instrumented OpenTelemetry metric using its instrument family.',
              evidence: signal.evidence,
              parameters: {
                [metricFieldName]: identifierParameter(
                  metricFieldName,
                  'Field containing the OpenTelemetry metric value.',
                  `metrics.${value}`
                ),
                ...(signal.metricKind === 'histogram'
                  ? {
                      percentile: {
                        description: 'Metric percentile to calculate.',
                        example: 95,
                        kind: 'number' as const,
                        name: 'percentile',
                      },
                    }
                  : {}),
                source: sourceParameter('metric'),
              },
              query: `TS [[source]]\n| WHERE [[${metricFieldName}]] IS NOT NULL\n| STATS ${metricStats(
                signal.metricKind,
                metricFieldName
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
              parameters: {
                source: sourceParameter('trace'),
                span_name_field: identifierParameter(
                  'span_name_field',
                  'Field containing the OpenTelemetry span operation name.',
                  'name'
                ),
                status_field: identifierParameter(
                  'status_field',
                  'Field containing the OpenTelemetry status code.',
                  'status.code'
                ),
              },
              query:
                'FROM [[source]]\n| WHERE [[status_field]] == "Error"\n| STATS count = COUNT(*) BY [[span_name_field]]',
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
              parameters: {
                exception_type_field: identifierParameter(
                  'exception_type_field',
                  'Field containing the recorded exception type.',
                  'attributes.exception.type'
                ),
                source: sourceParameter('trace'),
              },
              query:
                'FROM [[source]]\n| WHERE [[exception_type_field]] IS NOT NULL\n| STATS count = COUNT(*) BY [[exception_type_field]]',
              signalType: 'trace',
              title: 'Recorded OpenTelemetry exceptions',
            },
          }),
        ];
    }
  });
