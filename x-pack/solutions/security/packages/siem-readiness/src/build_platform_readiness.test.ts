/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildPlatformReadiness, matchPlatforms } from './build_platform_readiness';
import type { ActionableFinding } from './types';
import type { RuleIndexEntry } from './reverse_map_types';

const createRule = (overrides: Partial<RuleIndexEntry> = {}): RuleIndexEntry => ({
  id: 'rule-1',
  name: 'Test Rule',
  tactics: [{ id: 'TA0001', name: 'Initial Access' }],
  enabled: true,
  ...overrides,
});

const createFinding = (overrides: Partial<ActionableFinding> = {}): ActionableFinding => ({
  severity: 'WARNING',
  message: 'Test finding',
  resource: 'logs-aws.cloudtrail-default',
  ...overrides,
});

describe('buildPlatformReadiness', () => {
  const categoriesResult = {
    rawCategoriesMap: [],
    mainCategoriesMap: [
      {
        category: 'Cloud',
        indices: [{ indexName: 'logs-aws.cloudtrail-default', docs: 1000 }],
      },
    ],
  };

  it('returns a healthy platform with stream and rule counts', () => {
    const indexToPlatform = new Map([
      ['logs-aws.cloudtrail-default', 'AWS account 123456789012'],
      ['logs-aws.s3-default', 'AWS account 123456789012'],
    ]);
    const indexToRules = new Map([
      [
        'logs-aws.cloudtrail-default',
        [
          createRule({ id: 'rule-1' }),
          createRule({ id: 'rule-2', tactics: [{ id: 'TA0002', name: 'Execution' }] }),
        ],
      ],
    ]);

    const result = buildPlatformReadiness({
      indexToPlatform,
      indexToRules,
      pipelineToIndices: new Map(),
      categoryToIndices: new Map(),
      categoriesResult,
      findings: [],
    });

    expect(result.status).toBe('healthy');
    expect(result.platforms).toHaveLength(1);
    expect(result.platforms[0]).toMatchObject({
      platform: 'AWS account 123456789012',
      primaryCategory: 'Cloud',
      activeStreams: 2,
      enabledRules: 2,
      mitreTactics: 2,
      status: 'healthy',
    });
  });

  it('attributes continuity findings via affectedPlatform and sets topFinding', () => {
    const indexToPlatform = new Map([['logs-aws.cloudtrail-default', 'AWS account 123456789012']]);

    const result = buildPlatformReadiness({
      indexToPlatform,
      indexToRules: new Map(),
      pipelineToIndices: new Map([['cloudtrail-pipeline', ['logs-aws.cloudtrail-default']]]),
      categoryToIndices: new Map(),
      categoriesResult,
      findings: [
        {
          dimension: 'continuity',
          finding: createFinding({
            severity: 'CRITICAL',
            message: 'Data stream serving pipeline cloudtrail-pipeline has gone silent',
            resource: 'cloudtrail-pipeline',
            affectedPlatform: 'AWS account 123456789012',
            type: 'silence',
          }),
        },
      ],
    });

    expect(result.status).toBe('actionsRequired');
    expect(result.platforms[0].status).toBe('actionsRequired');
    expect(result.platforms[0].topFinding).toContain('gone silent');
    expect(result.platforms[0].findings).toHaveLength(1);
  });

  it('filters platforms by partial name match', () => {
    const indexToPlatform = new Map([
      ['logs-aws.cloudtrail-default', 'AWS account 123456789012'],
      ['logs-endpoint-default', 'windows Endpoints'],
    ]);

    const result = buildPlatformReadiness({
      indexToPlatform,
      indexToRules: new Map(),
      pipelineToIndices: new Map(),
      categoryToIndices: new Map(),
      categoriesResult,
      findings: [],
      platformFilter: 'aws account',
    });

    expect(result.platforms).toHaveLength(1);
    expect(result.platforms[0].platform).toBe('AWS account 123456789012');
  });

  it('summarizes when no platform matches the filter', () => {
    const indexToPlatform = new Map([['logs-aws.cloudtrail-default', 'AWS account 123456789012']]);

    const result = buildPlatformReadiness({
      indexToPlatform,
      indexToRules: new Map(),
      pipelineToIndices: new Map(),
      categoryToIndices: new Map(),
      categoriesResult,
      findings: [],
      platformFilter: 'gcp',
    });

    expect(result.platforms).toHaveLength(0);
    expect(result.summary).toContain('No platform matched "gcp"');
    expect(result.summary).toContain('AWS account 123456789012');
  });
});

describe('matchPlatforms', () => {
  it('returns exact and partial matches', () => {
    const platforms = ['AWS account 123456789012', 'windows Endpoints'];

    expect(matchPlatforms('AWS account 123456789012', platforms).matches).toEqual([
      'AWS account 123456789012',
    ]);
    expect(matchPlatforms('windows', platforms).matches).toEqual(['windows Endpoints']);
  });
});
