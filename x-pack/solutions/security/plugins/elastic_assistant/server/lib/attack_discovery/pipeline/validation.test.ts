/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pipelineRunRequestSchema, isValidAlertDocument } from './validation';

describe('pipelineRunRequestSchema', () => {
  it('accepts a minimal valid request', () => {
    const result = pipelineRunRequestSchema.validate({});
    expect(result.spaceId).toBe('default');
    expect(result.dryRun).toBe(false);
  });

  it('accepts full configuration', () => {
    const input = {
      spaceId: 'sec-ops',
      dryRun: true,
      config: {
        enabled: true,
        intervalMinutes: 30,
        deduplication: { enabled: true, similarityThreshold: 0.9, maxResults: 50 },
        entityExtraction: { enabled: true, exclusionFilters: { user: ['SYSTEM'] } },
        caseMatching: {
          enabled: true,
          strategy: 'weighted' as const,
          matchThreshold: 0.5,
          weights: {
            ip: 1.0,
            hostname: 0.8,
            user: 0.7,
            fileHash: 1.0,
            domain: 0.6,
            process: 0.5,
            other: 0.3,
          },
          temporalDecayDays: 14,
        },
        incrementalAd: { enabled: true, minNewAlerts: 5, autoTriggerOnAttachment: false },
      },
    };

    const result = pipelineRunRequestSchema.validate(input);
    expect(result.spaceId).toBe('sec-ops');
    expect(result.config?.deduplication?.similarityThreshold).toBe(0.9);
  });

  it('rejects spaceId that is too long', () => {
    expect(() => pipelineRunRequestSchema.validate({ spaceId: 'a'.repeat(101) })).toThrow();
  });

  it('rejects out-of-range similarity threshold', () => {
    expect(() =>
      pipelineRunRequestSchema.validate({
        config: { deduplication: { similarityThreshold: 2.0 } },
      })
    ).toThrow();
  });

  it('rejects invalid strategy value', () => {
    expect(() =>
      pipelineRunRequestSchema.validate({
        config: { caseMatching: { strategy: 'invalid' } },
      })
    ).toThrow();
  });
});

describe('isValidAlertDocument', () => {
  it('returns true for a well-formed alert', () => {
    expect(
      isValidAlertDocument({
        kibana: {
          alert: {
            rule: { name: 'Test Rule' },
            risk_score: 50,
          },
        },
      })
    ).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(isValidAlertDocument({})).toBe(false);
  });

  it('returns false when kibana.alert is missing', () => {
    expect(isValidAlertDocument({ kibana: {} })).toBe(false);
  });

  it('returns false when rule.name is missing', () => {
    expect(isValidAlertDocument({ kibana: { alert: { rule: {} } } })).toBe(false);
  });

  it('returns false for null input', () => {
    expect(isValidAlertDocument(null as unknown as Record<string, unknown>)).toBe(false);
  });
});
