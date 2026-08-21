/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import {
  buildHuntFindingId,
  huntFindingTimeBucket,
  persistHuntFindings,
} from './persist_hunt_findings';
import type { PersistableHuntSnapshot } from './persist_hunt_findings';

const logger = { warn: jest.fn(), debug: jest.fn(), info: jest.fn() } as unknown as Logger;

const baseBehavior = {
  technique_id: 'T1078',
  evidence_quote: 'Valid accounts used for initial access',
  llm_confidence: 0.9,
  confidence: 0.85,
  technique_name: 'Valid Accounts',
  reference: 'https://attack.mitre.org/techniques/T1078/',
  tactic_ids: ['TA0001'],
  proposed_esql_rule: 'FROM logs-* | WHERE event.action == "login"',
  rule_name: 'TI — Valid Accounts',
  severity: 'high' as const,
  risk_score: 73,
  finding_id: 'finding-1',
};

const baseResult: PersistableHuntSnapshot = {
  status: 'tier1_and_tier2',
  report_id: 'report-1',
  tier1: {
    status: 'environment_hits_found',
    affected_assets: {
      hosts: [{ name: 'host-a' }],
      users: [{ name: 'user-a' }],
    },
  },
  tier2: {
    behaviors: [baseBehavior],
  },
};

describe('huntFindingTimeBucket', () => {
  it('returns a YYYY-MM-DD UTC date string', () => {
    expect(huntFindingTimeBucket(new Date('2026-07-17T15:30:00.000Z'))).toBe('2026-07-17');
  });
});

describe('buildHuntFindingId', () => {
  it('returns a stable fingerprint for the same inputs', () => {
    const a = buildHuntFindingId({
      reportId: 'report-1',
      techniqueId: 'T1078',
      timeBucket: '2026-07-17',
    });
    const b = buildHuntFindingId({
      reportId: 'report-1',
      techniqueId: 'T1078',
      timeBucket: '2026-07-17',
    });
    expect(a).toBe(b);
  });
});

describe('persistHuntFindings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns zeros when there are no Tier 2 behaviors', async () => {
    const esClient = { create: jest.fn() } as unknown as ElasticsearchClient;
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: { ...baseResult, tier2: { behaviors: [] } },
    });
    expect(result).toEqual({ attempted: 0, created: 0, skipped: 0, errors: 0 });
  });

  it('creates a finding document with deterministic id', async () => {
    const create = jest.fn().mockResolvedValue({});
    const esClient = { create } as unknown as ElasticsearchClient;
    const now = new Date('2026-07-17T12:00:00.000Z');
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: baseResult,
      reportTitle: 'Okta takeover',
      hypothesisRationale: 'Hunted because report Okta takeover.',
      now,
    });
    expect(result.created).toBe(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        id: buildHuntFindingId({
          reportId: 'report-1',
          techniqueId: 'T1078',
          timeBucket: '2026-07-17',
        }),
        document: expect.objectContaining({
          report_id: 'report-1',
          technique_id: 'T1078',
          hypothesis_rationale: 'Hunted because report Okta takeover.',
          affected_assets: { hosts: ['host-a'], users: ['user-a'] },
        }),
      })
    );
  });

  it('counts version conflicts as skipped', async () => {
    const create = jest.fn().mockRejectedValue({ statusCode: 409 });
    const esClient = { create } as unknown as ElasticsearchClient;
    const result = await persistHuntFindings(esClient, logger, {
      spaceId: 'default',
      result: baseResult,
      now: new Date('2026-07-17T12:00:00.000Z'),
    });
    expect(result.skipped).toBe(1);
  });
});
