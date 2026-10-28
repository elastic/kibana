/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_HYPOTHESES,
  MAX_IMPACT_TOOL_ENTITIES,
} from '@kbn/agentic-investigations-plugin/common';
import {
  FINDINGS_JSON_SCHEMA,
  findingsOutputSchema,
  entityIdFor,
  limitEvidence,
  limitFindings,
} from './output_schema';

describe('findings output', () => {
  it('sets no hard size limits in the schema the model is held to', () => {
    expect(JSON.stringify(FINDINGS_JSON_SCHEMA)).not.toMatch(/maxLength|maxItems/);
  });

  it('accepts long text and trims it to the store limits', () => {
    const long = 'x'.repeat(20_000);
    const parsed = findingsOutputSchema.safeParse({
      summary: long,
      verdict: long,
      impact_summary: long,
      impact_entities: Array.from({ length: 20 }, (_, i) => ({ name: `svc-${i}` })),
      hypotheses: Array.from({ length: MAX_HYPOTHESES + 10 }, () => ({
        candidate: long,
        confidence: 1.4,
        status: 'investigating' as const,
        reason: long,
      })),
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;

    const limited = limitFindings(parsed.data);
    expect(limited.summary.length).toBeLessThan(long.length);
    expect(limited.verdict?.length).toBeLessThan(long.length);
    expect(limited.impact_summary?.length).toBeLessThan(long.length);
    expect(limited.impact_entities).toHaveLength(MAX_IMPACT_TOOL_ENTITIES);
    expect(limited.hypotheses).toHaveLength(MAX_HYPOTHESES);
    expect(limited.hypotheses[0].confidence).toBe(1);
    expect(limited.hypotheses[0].candidate.length).toBeLessThan(long.length);
  });

  it('still rejects a record without a summary or with an unknown status', () => {
    expect(findingsOutputSchema.safeParse({ hypotheses: [] }).success).toBe(false);
    expect(
      findingsOutputSchema.safeParse({
        summary: 's',
        hypotheses: [{ candidate: 'c', confidence: 0.5, status: 'maybe' }],
      }).success
    ).toBe(false);
  });
});

describe('evidence', () => {
  const chart = (points: Array<{ x: string; y: number }>) => ({
    type: 'line' as const,
    title: 'Errors per minute, 01:00 to 01:30 UTC',
    x_axis: { type: 'time' as const },
    y_axis: { unit: 'number' as const },
    series: [{ name: 'errors', points }],
    annotations: [{ x: '2026-08-09T01:12:00Z', label: 'deploy' }],
  });
  const points = [
    { x: '2026-08-09T01:10:00Z', y: 3 },
    { x: '2026-08-09T01:11:00Z', y: 412 },
    { x: '2026-08-09T01:12:00Z', y: 398 },
  ];

  it('keeps a chart that fits and its description', () => {
    expect(limitEvidence({ description: 'Errors jumped.', chart: chart(points) })).toEqual({
      description: 'Errors jumped.',
      chart: chart(points),
    });
  });

  it('drops points that are not finite numbers or have no x, and a chart left with none', () => {
    const kept = limitEvidence({
      chart: chart([...points, { x: '', y: 5 }, { x: '2026-08-09T01:13:00Z', y: Number.NaN }]),
    });
    expect(kept?.chart?.series[0].points).toHaveLength(3);
    expect(limitEvidence({ description: 'Only text.', chart: chart([]) })).toEqual({
      description: 'Only text.',
    });
    expect(limitEvidence({ chart: chart([]) })).toBeUndefined();
  });

  it('trims a chart to the store limits', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ x: `2026-08-09T01:${i}`, y: i }));
    const kept = limitEvidence({
      chart: {
        ...chart(many),
        series: Array.from({ length: 9 }, () => ({ name: 'a', points: many })),
      },
    });
    expect(kept?.chart?.series).toHaveLength(5);
    expect(kept?.chart?.series[0].points).toHaveLength(100);
  });

  it('thins an oversized series across the whole window, keeping the first and last point', () => {
    const many = Array.from({ length: 300 }, (_, i) => ({ x: `2026-08-09T01:${i}`, y: i }));
    const [{ points: kept }] = limitEvidence({ chart: chart(many) })?.chart?.series ?? [];
    expect(kept).toHaveLength(100);
    expect(kept[0]).toEqual(many[0]);
    expect(kept[99]).toEqual(many[299]);
  });

  it('keeps every point of a series that fits', () => {
    const exact = Array.from({ length: 100 }, (_, i) => ({ x: `2026-08-09T01:${i}`, y: i }));
    expect(limitEvidence({ chart: chart(exact) })?.chart?.series[0].points).toEqual(exact);
  });

  it('lets a record retract the impact evidence with null, and keeps omission distinct', () => {
    const base = { summary: 's', impact_summary: 'x', hypotheses: [] };
    const retract = findingsOutputSchema.safeParse({ ...base, impact_evidence: null });
    expect(retract.success).toBe(true);
    if (!retract.success) return;
    expect(limitFindings(retract.data).impact_evidence).toBeNull();
    const omit = findingsOutputSchema.safeParse(base);
    if (!omit.success) throw new Error('expected a valid record');
    expect(limitFindings(omit.data).impact_evidence).toBeUndefined();
  });

  it('carries evidence through the record, keeping at most two items per hypothesis', () => {
    const parsed = findingsOutputSchema.safeParse({
      summary: 's',
      impact_summary: 'Checkout failed.',
      impact_evidence: { chart: chart(points) },
      hypotheses: [
        {
          candidate: 'Bad deploy',
          confidence: 0.8,
          status: 'confirmed',
          evidence: [{ description: 'a' }, { description: 'b' }, { description: 'c' }],
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    const record = limitFindings(parsed.data);
    expect(record.impact_evidence?.chart?.series[0].points).toHaveLength(3);
    expect(record.hypotheses[0].evidence).toHaveLength(2);
  });
});

describe('entityIdFor', () => {
  it('uses the name when it fits the id limit', () => {
    expect(entityIdFor('checkout')).toBe('checkout');
    expect(entityIdFor('a'.repeat(256))).toBe('a'.repeat(256));
  });

  it('bounds a longer name, stably, and keeps names with the same start apart', () => {
    const first = `${'a'.repeat(300)}-one`;
    const second = `${'a'.repeat(300)}-two`;
    expect(entityIdFor(first).length).toBeLessThanOrEqual(256);
    expect(entityIdFor(first)).toBe(entityIdFor(first));
    expect(entityIdFor(first)).not.toBe(entityIdFor(second));
  });
});
