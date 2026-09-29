/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateLogTemplates } from '../logging/generate_log_templates';
import { deduplicateTemplates } from './deduplicate_templates';
import { queryTemplateRt } from '../models/query_codec';
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
      'FROM logs*\n| WHERE MATCH_PHRASE(message, "Processed order") AND MATCH_PHRASE(message, "with status")'
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
    }
  });

  it('inlines the conventional trace source and OTel field names', () => {
    /** Generates the span count and latency templates plus an error-status template. */
    const templates = generateOtelTemplates({
      context,
      signals: [
        { evidence, kind: 'span_name', language: 'TypeScript', value: 'user_session_start' },
        { evidence, kind: 'error_status', language: 'TypeScript' },
      ],
    });
    const queries = templates.map((template) => template.query);
    expect(queries).toEqual([
      'FROM traces*\n| WHERE name == "user_session_start"\n| STATS total = COUNT(*), errors = COUNT(*) WHERE status.code == "Error"',
      'FROM traces*\n| WHERE name == "user_session_start"\n| STATS p95_latency = PERCENTILE(duration, 95)',
      'FROM traces*\n| WHERE status.code == "Error"\n| STATS count = COUNT(*) BY name',
    ]);
    for (const query of queries.slice(0, 2)) {
      expect(query.startsWith('FROM traces*\n')).toBe(true);
      expect(query).toContain('name ==');
    }
    expect(queries[0]).toContain('status.code');
  });

  it('renders attribute keys bare when safe and backtick-quoted otherwise', () => {
    const templates = generateOtelTemplates({
      context,
      signals: [
        { evidence, kind: 'attr_key', language: 'TypeScript', value: 'http.request.method' },
        { evidence, kind: 'attr_key', language: 'TypeScript', value: 'my-attr' },
      ],
    });
    expect(templates.map((template) => template.query)).toEqual([
      'FROM traces*\n| WHERE attributes.http.request.method IS NOT NULL\n| STATS count = COUNT(*) BY attributes.http.request.method',
      'FROM traces*\n| WHERE `attributes.my-attr` IS NOT NULL\n| STATS count = COUNT(*) BY `attributes.my-attr`',
    ]);
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

  it('keeps astral-Unicode source names distinct in metric template identities', () => {
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
    const rendered = templates.map((template) => template.query);
    expect(templates).toHaveLength(12);
    for (const template of templates) {
      expect(queryTemplateRt.decode(template)._tag).toBe('Right');
    }
    expect(rendered).toContain(
      'TS metrics*\n| WHERE metrics.requests IS NOT NULL\n| STATS rate = SUM(RATE(metrics.requests))'
    );
    expect(rendered).toContain(
      'TS metrics*\n| WHERE metrics.duration IS NOT NULL\n| STATS p95 = AVG(PERCENTILE_OVER_TIME(metrics.duration, 95))'
    );
    expect(rendered).toContain(
      'TS metrics*\n| WHERE metrics.queue.depth IS NOT NULL\n| STATS avg = AVG(AVG_OVER_TIME(metrics.queue.depth))'
    );
    expect(rendered).toContain('FROM traces*\n| WHERE attributes.retry.enabled == true');
    expect(rendered).toContain('FROM traces*\n| WHERE event.name == "payment.failed"');
    expect(rendered).toContain(
      'FROM traces*\n| WHERE attributes.exception.type IS NOT NULL\n| STATS count = COUNT(*) BY attributes.exception.type'
    );
    expect(rendered).toContain(
      'FROM traces*\n| WHERE attributes.cart.total IS NOT NULL\n| STATS avg = AVG(attributes.cart.total), max = MAX(attributes.cart.total), p95 = PERCENTILE(attributes.cart.total, 95)'
    );
    expect(
      templates
        .filter((template) => template.signalType === 'metric')
        .every((template) => template.query.startsWith('TS metrics*\n'))
    ).toBe(true);
    expect(
      templates
        .filter((template) => template.signalType === 'trace')
        .every((template) => template.query.startsWith('FROM traces*\n'))
    ).toBe(true);
    expect(rendered.every((query) => !query.includes('[[') && !query.includes(']]'))).toBe(true);
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
