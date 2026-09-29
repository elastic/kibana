/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateLogTemplates } from '../logging/generate_log_templates';
import { deduplicateTemplates } from './deduplicate_templates';
import {
  queryTemplateRt,
  renderQueryTemplate,
  type QueryParameter,
  type QueryTemplate,
} from '../models/query_codec';
import { generateOtelTemplates } from '../otel/generate_otel_templates';

/** Supplies immutable metadata required by all pure template builders. */
const context = {
  extractorVersion: 'code-intelligence-poc-0.1.0',
  repository: 'elastic/example',
  revision: 'a'.repeat(40),
};
/** Supplies bounded source evidence for generated templates. */
const evidence = [{ excerpt: 'instrumentation call', line: 4, path: 'src/app.ts' }];

describe('deterministic template generation', () => {
  it('uses ANDed full-text logging segments and renders source-derived literals safely', () => {
    /** Generates a log template that retains anchors around an interpolation. */
    const templates = generateLogTemplates({
      context,
      signatures: [
        {
          evidence,
          level: 'error',
          message: 'Processed order ${orderId} with status ${status}',
          severity: 70,
          staticPrefix: 'Processed order',
          staticSegments: ['Processed order', 'with status'],
        },
      ],
    });
    expect(templates).toHaveLength(1);
    expect(templates[0].query).toBe(
      'FROM [[source]]\n| WHERE MATCH_PHRASE(message, "Processed order") AND MATCH_PHRASE(message, "with status")'
    );
    expect(Object.keys(templates[0].parameters)).toEqual(['source']);
    expect(renderQueryTemplate(templates[0]).query).toContain(
      'MATCH_PHRASE(message, "Processed order") AND MATCH_PHRASE(message, "with status")'
    );
  });

  it('inlines safely escaped logging and OTel source literals', () => {
    /** Exercises source text that requires ES|QL string escaping. */
    const literal: string = '"quoted" \\ path café 😀';
    /** Generates a logging template with an unusual but static message segment. */
    const logTemplate = generateLogTemplates({
      context,
      signatures: [
        {
          evidence,
          level: 'info',
          message: literal,
          severity: 30,
          staticPrefix: literal,
          staticSegments: [literal],
        },
      ],
    })[0];
    /** Generates an OTel span template with the same unusual static literal. */
    const otelTemplate = generateOtelTemplates({
      context,
      signals: [{ evidence, kind: 'span_name', language: 'TypeScript', value: literal }],
    })[0];
    for (const template of [logTemplate, otelTemplate]) {
      expect(queryTemplateRt.decode(template)._tag).toBe('Right');
      expect(template.query).toContain('\\"quoted\\" \\\\ path café 😀');
      expect(renderQueryTemplate(template).query).toContain('\\"quoted\\" \\\\ path café 😀');
    }
    expect(Object.keys(logTemplate.parameters)).toEqual(['source']);
    expect(Object.keys(otelTemplate.parameters).sort()).toEqual(
      ['source', 'span_name_field', 'status_field'].sort()
    );
  });

  it('renders trace templates with alternate span, status, and duration fields', () => {
    /** Generates the span count and latency templates plus an error-status template. */
    const templates = generateOtelTemplates({
      context,
      signals: [
        { evidence, kind: 'span_name', language: 'TypeScript', value: 'checkout' },
        { evidence, kind: 'error_status', language: 'TypeScript' },
      ],
    });
    /** Rebinds every trace field to prove it remains deployment-configurable. */
    const rebound = templates.map((template): QueryTemplate => {
      /** Copies parameter metadata before replacing the deployment-specific field examples. */
      const parameters: Record<string, QueryParameter> = { ...template.parameters };
      if (parameters.span_name_field !== undefined) {
        parameters.span_name_field = {
          description: 'Field containing the OpenTelemetry span operation name.',
          example: 'operation',
          kind: 'identifier',
          name: 'span_name_field',
        };
      }
      if (parameters.status_field !== undefined) {
        parameters.status_field = {
          description: 'Field containing the OpenTelemetry status code.',
          example: 'outcome.code',
          kind: 'identifier',
          name: 'status_field',
        };
      }
      if (parameters.duration_field !== undefined) {
        parameters.duration_field = {
          description: 'Field containing the OpenTelemetry span duration.',
          example: 'transaction.elapsed',
          kind: 'identifier',
          name: 'duration_field',
        };
      }
      return { ...template, parameters };
    });
    /** Renders rebased templates to assert their fields remain parameterized at query execution time. */
    const rendered = rebound.map((template) => renderQueryTemplate(template).query);
    expect(rendered).toContain(
      'FROM traces-application-*\n| WHERE `operation` == "checkout"\n| STATS total = COUNT(*), errors = COUNT(*) WHERE `outcome.code` == "Error"'
    );
    expect(rendered).toContain(
      'FROM traces-application-*\n| WHERE `operation` == "checkout"\n| STATS p95_latency = PERCENTILE(`transaction.elapsed`, 95)'
    );
    expect(rendered).toContain(
      'FROM traces-application-*\n| WHERE `outcome.code` == "Error"\n| STATS count = COUNT(*) BY `operation`'
    );
  });

  it('distinguishes different static literals while merging identical literal templates', () => {
    /** Produces 2 identical anchors and 1 distinct anchor in the same extraction scope. */
    const templates = generateLogTemplates({
      context,
      signatures: ['same', 'same', 'different'].map((segment, index) => ({
        evidence: [{ excerpt: segment, line: index + 1, path: 'src/app.ts' }],
        level: 'info',
        message: segment,
        severity: 30,
        staticPrefix: segment,
        staticSegments: [segment],
      })),
    });
    expect(templates[0].id).toBe(templates[1].id);
    expect(templates[0].id).not.toBe(templates[2].id);
    expect(deduplicateTemplates(templates)).toHaveLength(2);
  });

  it('keeps unpaired-surrogate source literals distinct in generated queries and identities', () => {
    /** Uses source literals that TextEncoder would otherwise replace with the same code point. */
    const templates = generateOtelTemplates({
      context,
      signals: [
        { evidence, kind: 'span_name', language: 'TypeScript', value: 'span-\uD800' },
        { evidence, kind: 'span_name', language: 'TypeScript', value: 'span-\uD801' },
      ],
    });

    expect(templates).toHaveLength(4);
    expect(new Set(templates.map((template) => template.query)).size).toBe(4);
    expect(new Set(templates.map((template) => template.id)).size).toBe(4);
    expect(deduplicateTemplates(templates)).toHaveLength(4);
  });

  it('keeps astral-Unicode source names distinct in parameterized metric template identities', () => {
    /** Uses astral code points with the same leading UTF-16 surrogate. */
    const templates = generateOtelTemplates({
      context,
      signals: [
        { evidence, kind: 'metric_name', language: 'TypeScript', metricKind: 'gauge', value: '😀' },
        { evidence, kind: 'metric_name', language: 'TypeScript', metricKind: 'gauge', value: '😁' },
      ],
    });
    expect(templates).toHaveLength(2);
    expect(templates[0].id).not.toBe(templates[1].id);
  });

  it('maps every static OTel family to a rendered template and skips dynamic names', () => {
    /** Provides one signal from every supported static OTel family plus a dynamic signal. */
    const templates = generateOtelTemplates({
      context,
      signals: [
        { evidence, kind: 'span_name', language: 'TypeScript', value: 'checkout' },
        { evidence, kind: 'event_name', language: 'TypeScript', value: 'payment.failed' },
        {
          evidence,
          kind: 'attr_key',
          language: 'TypeScript',
          value: 'retry.enabled',
          valueHint: 'bool',
        },
        {
          evidence,
          kind: 'attr_key',
          language: 'TypeScript',
          value: 'cart.total',
          valueHint: 'number',
        },
        { evidence, kind: 'attr_key', language: 'TypeScript', value: 'order.id', valueHint: 'id' },
        {
          evidence,
          kind: 'metric_name',
          language: 'TypeScript',
          metricKind: 'counter',
          value: 'requests',
        },
        {
          evidence,
          kind: 'metric_name',
          language: 'TypeScript',
          metricKind: 'histogram',
          value: 'duration',
        },
        {
          evidence,
          kind: 'metric_name',
          language: 'TypeScript',
          metricKind: 'gauge',
          value: 'queue.depth',
        },
        {
          evidence,
          kind: 'metric_name',
          language: 'TypeScript',
          metricKind: 'updown',
          value: 'connections',
        },
        { evidence, kind: 'error_status', language: 'TypeScript', value: 'error' },
        { evidence, kind: 'record_exception', language: 'TypeScript', value: 'exception' },
        { evidence, kind: 'span_name', language: 'TypeScript', templated: true },
      ],
    });
    /** Renders all templates to enforce the declared-parameter and no-raw-placeholder invariant. */
    const rendered = templates.map((template) => renderQueryTemplate(template).query);
    expect(templates).toHaveLength(12);
    expect(rendered.some((query) => query.includes('TS metrics-application-*'))).toBe(true);
    expect(rendered).toContain(
      'TS metrics-application-*\n| WHERE `metrics.requests` IS NOT NULL\n| STATS rate = SUM(RATE(`metrics.requests`))'
    );
    expect(rendered).toContain(
      'TS metrics-application-*\n| WHERE `metrics.duration` IS NOT NULL\n| STATS p95 = AVG(PERCENTILE_OVER_TIME(`metrics.duration`, 95))'
    );
    expect(rendered).toContain(
      'TS metrics-application-*\n| WHERE `metrics.queue.depth` IS NOT NULL\n| STATS avg = AVG(AVG_OVER_TIME(`metrics.queue.depth`))'
    );
    expect(rendered).toContain(
      'FROM traces-application-*\n| WHERE `attributes.retry.enabled` == false'
    );
    expect(rendered).toContain(
      'FROM traces-application-*\n| WHERE `event.name` == "payment.failed"'
    );
    expect(rendered).toContain(
      'FROM traces-application-*\n| WHERE `attributes.exception.type` IS NOT NULL\n| STATS count = COUNT(*) BY `attributes.exception.type`'
    );
    expect(rendered.every((query) => !query.includes('[['))).toBe(true);
    expect(new Set(templates.map((template) => template.id)).size).toBe(12);
  });

  it('retains metric evidence without generating a query when instrument kind is absent', () => {
    /** Represents a codec-valid extracted metric whose instrument constructor was unavailable. */
    const signal = {
      evidence,
      kind: 'metric_name' as const,
      language: 'TypeScript',
      value: 'requests',
    };
    /** Template generation must not invent gauge aggregation semantics for an unknown instrument kind. */
    const templates = generateOtelTemplates({ context, signals: [signal] });

    expect(templates).toEqual([]);
    expect(signal.evidence).toEqual(evidence);
  });
});
