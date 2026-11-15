/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { packageReportInputSchema } from './package_report';

const defaultInput = {
  spaceId: 'default',
  reportId: 'rpt-1',
  investigationConversationId: 'conv-1',
  runId: 'run-1',
  huntStatus: 'success' as const,
  hasConfirmedHit: false,
};

const behavior = {
  technique_id: 'T1110.003',
  technique_name: 'Password Spraying',
  evidence_quote: 'ConsoleLogin failures across eu-central-1.',
  confidence: 0.92,
  validated_esql: 'FROM logs-aws.cloudtrail-* | LIMIT 25',
  execution: { executed: true, row_count: 0, hit: false },
};

describe('packageReportInputSchema coordinator results', () => {
  it('accepts an input that omits both', () => {
    expect(packageReportInputSchema.safeParse(defaultInput).success).toBe(true);
  });

  it('accepts the report-intent targets and behaviors', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        reportIntentTargets: ['logs-aws.cloudtrail-*'],
        behaviors: [behavior],
      }).success
    ).toBe(true);
  });

  it('accepts a behavior that carries no execution', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        behaviors: [{ ...behavior, execution: undefined }],
      }).success
    ).toBe(true);
  });

  it('accepts an inconclusive reason on a behavior execution', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        behaviors: [
          {
            ...behavior,
            execution: {
              executed: true,
              row_count: 0,
              hit: false,
              inconclusive_reason: 'rows_unclassifiable',
            },
          },
        ],
      }).success
    ).toBe(true);
  });

  it('strips fields it does not declare, such as raw hit documents', () => {
    expect(
      packageReportInputSchema.parse({
        ...defaultInput,
        behaviors: [{ ...behavior, hits: [{ id: 'a', index: 'b' }] }],
      }).behaviors?.[0]
    ).not.toHaveProperty('hits');
  });

  it('rejects more than 200 report-intent targets', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        reportIntentTargets: Array.from({ length: 201 }, (_, i) => `logs-a${i}-*`),
      }).success
    ).toBe(false);
  });

  it('rejects a target longer than 512 characters', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        reportIntentTargets: ['x'.repeat(513)],
      }).success
    ).toBe(false);
  });

  it('rejects more than 20 behaviors', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        behaviors: Array.from({ length: 21 }, () => behavior),
      }).success
    ).toBe(false);
  });

  it('rejects a query over the coordinator 32k bound', () => {
    expect(
      packageReportInputSchema.safeParse({
        ...defaultInput,
        behaviors: [{ ...behavior, validated_esql: `FROM a-* | ${'x'.repeat(32_001)}` }],
      }).success
    ).toBe(false);
  });
});
