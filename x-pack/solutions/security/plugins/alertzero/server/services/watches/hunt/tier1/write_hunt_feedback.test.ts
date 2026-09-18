/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { HUNT_FEEDBACK_OWNED_FIELDS } from './feedback_fields';
import type { HuntForThreatResult } from './types';
import {
  buildHuntFeedbackDoc,
  collapseHuntStatus,
  computeBoost,
  huntFeedbackWriteKeys,
  resolveHuntFeedbackTarget,
  writeHuntFeedback,
} from './write_hunt_feedback';

const FIXED_NOW = new Date('2026-05-14T12:00:00.000Z');

const tier1Hits = (overrides?: Partial<HuntForThreatResult>): HuntForThreatResult => ({
  status: 'environment_hits_found',
  hasConfirmedHit: true,
  searchedIocs: 4,
  searchedTechniques: 2,
  resolvedIocs: [],
  resolvedTechniques: [],
  timeRange: { from: '2026-04-14T00:00:00Z', to: '2026-05-14T00:00:00Z' },
  counts: { totalHits: 7, returnedHits: 7, affectedHosts: 3, affectedUsers: 2 },
  hits: [],
  affectedAssets: { hosts: [], users: [] },
  perIndex: [],
  ...overrides,
});

const tier1NoHits = (): HuntForThreatResult => ({
  status: 'no_environment_hits',
  hasConfirmedHit: false,
  searchedIocs: 4,
  searchedTechniques: 0,
  resolvedIocs: [],
  resolvedTechniques: [],
  timeRange: { from: '2026-04-14T00:00:00Z', to: '2026-05-14T00:00:00Z' },
  counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
  hits: [],
  affectedAssets: { hosts: [], users: [] },
  perIndex: [],
});

const tier1NoSearchableTerms = (): HuntForThreatResult => ({
  status: 'no_searchable_terms',
  hasConfirmedHit: false,
  searchedIocs: 0,
  searchedTechniques: 0,
  resolvedIocs: [],
  resolvedTechniques: [],
  timeRange: { from: '2026-04-14T00:00:00Z', to: '2026-05-14T00:00:00Z' },
  counts: { totalHits: 0, returnedHits: 0, affectedHosts: 0, affectedUsers: 0 },
  hits: [],
  affectedAssets: { hosts: [], users: [] },
  perIndex: [],
});

describe('collapseHuntStatus', () => {
  it('collapses environment_hits_found + hasConfirmedHit to hit', () => {
    expect(collapseHuntStatus(tier1Hits())).toBe('hit');
  });

  it('collapses no_environment_hits to clean', () => {
    expect(collapseHuntStatus(tier1NoHits())).toBe('clean');
  });

  it('collapses no_searchable_terms to clean', () => {
    expect(collapseHuntStatus(tier1NoSearchableTerms())).toBe('clean');
  });

  it('collapses environment_hits_found without a confirmed (required-index) hit to clean', () => {
    // A hit landed only in an optional index — huntForThreat still reports
    // status=environment_hits_found but hasConfirmedHit=false.
    expect(collapseHuntStatus(tier1Hits({ hasConfirmedHit: false }))).toBe('clean');
  });
});

describe('computeBoost', () => {
  it('returns 0 for zero hits', () => {
    expect(computeBoost(0, 0)).toBe(0);
  });

  it('is monotone non-decreasing with IOC hits', () => {
    const b1 = computeBoost(1, 0);
    const b10 = computeBoost(10, 0);
    const b100 = computeBoost(100, 0);
    expect(b10).toBeGreaterThan(b1);
    expect(b100).toBeGreaterThanOrEqual(b10);
  });

  it('clamps to the documented 0.5 ceiling for large hit counts', () => {
    expect(computeBoost(100_000, 100_000)).toBeLessThanOrEqual(0.5);
    expect(computeBoost(100_000, 100_000)).toBeCloseTo(0.5, 5);
  });

  it('weights IOC hits more heavily than TTP hits', () => {
    expect(computeBoost(5, 0)).toBeGreaterThan(computeBoost(0, 5));
  });

  it('treats negative hit counts as zero (defensive)', () => {
    expect(computeBoost(-5, -5)).toBe(0);
  });

  it('returns 0 when inputs are NaN', () => {
    expect(computeBoost(Number.NaN, Number.NaN)).toBe(0);
  });
});

describe('buildHuntFeedbackDoc', () => {
  const target = { index: '.ds-.kibana-threat-reports-000001', id: 'report-1' };
  const runId = 'run-abc123';

  it('records every counter, the run id, and the wall-clock', () => {
    const doc = buildHuntFeedbackDoc({ target, tier1: tier1Hits(), runId, now: FIXED_NOW });
    expect(doc.feedback).toEqual({
      ioc_hit_count: 7,
      ttp_hit_count: 7, // searchedTechniques > 0 → upper-bound = totalHits
      affected_host_count: 3,
      affected_user_count: 2,
      last_hunted_at: FIXED_NOW.toISOString(),
      last_hunt_status: 'hit',
      last_hunt_window: { from: '2026-04-14T00:00:00Z', to: '2026-05-14T00:00:00Z' },
      last_hunt_run_id: runId,
      last_hunt_hit_count: 7,
    });
  });

  it('omits last_hunt_hit_count when there are zero hits', () => {
    const doc = buildHuntFeedbackDoc({ target, tier1: tier1NoHits(), runId, now: FIXED_NOW });
    expect(doc.feedback.last_hunt_hit_count).toBeUndefined();
    expect(doc.feedback.last_hunt_status).toBe('clean');
  });

  it('treats searchedTechniques=0 as ttp_hit_count=0 to avoid inflating the boost', () => {
    const doc = buildHuntFeedbackDoc({
      target,
      tier1: tier1Hits({ searchedTechniques: 0 }),
      runId,
      now: FIXED_NOW,
    });
    expect(doc.feedback.ttp_hit_count).toBe(0);
  });

  it('always sets last_hunt_run_id even on a clean run', () => {
    const doc = buildHuntFeedbackDoc({
      target,
      tier1: tier1NoSearchableTerms(),
      runId,
      now: FIXED_NOW,
    });
    expect(doc.feedback.last_hunt_run_id).toBe(runId);
    expect(doc.feedback.last_hunt_status).toBe('clean');
  });

  it('omits corroborated_rank_score when the base rank_score is unknown', () => {
    const doc = buildHuntFeedbackDoc({ target, tier1: tier1Hits(), runId, now: FIXED_NOW });
    expect(doc.corroborated_rank_score).toBeUndefined();
  });

  it('computes corroborated_rank_score = rankScore * (1 + boost) when rankScore is provided', () => {
    const doc = buildHuntFeedbackDoc({
      target: { ...target, rankScore: 0.4 },
      tier1: tier1Hits({
        counts: { totalHits: 10, returnedHits: 10, affectedHosts: 2, affectedUsers: 2 },
      }),
      runId,
      now: FIXED_NOW,
    });
    const expectedBoost = computeBoost(10, 10);
    expect(doc.corroborated_rank_score).toBeCloseTo(0.4 * (1 + expectedBoost), 6);
  });

  it('is byte-identical to rankScore when no environment hits matched', () => {
    const doc = buildHuntFeedbackDoc({
      target: { ...target, rankScore: 0.4 },
      tier1: tier1NoHits(),
      runId,
      now: FIXED_NOW,
    });
    expect(doc.corroborated_rank_score).toBeCloseTo(0.4, 6);
    expect(doc.feedback.ioc_hit_count).toBe(0);
  });

  it('caps corroborated_rank_score at 1.5x the base rankScore', () => {
    const doc = buildHuntFeedbackDoc({
      target: { ...target, rankScore: 0.6 },
      tier1: tier1Hits({
        counts: {
          totalHits: 1_000_000,
          returnedHits: 1_000_000,
          affectedHosts: 1,
          affectedUsers: 1,
        },
      }),
      runId,
      now: FIXED_NOW,
    });
    expect(doc.corroborated_rank_score).toBeLessThanOrEqual(0.6 * 1.5 + 1e-9);
    expect(doc.corroborated_rank_score).toBeCloseTo(0.6 * 1.5, 5);
  });

  it('floors negative counters to zero before boosting', () => {
    const doc = buildHuntFeedbackDoc({
      target: { ...target, rankScore: 0.4 },
      tier1: tier1Hits({
        counts: { totalHits: -5, returnedHits: 0, affectedHosts: -1, affectedUsers: -1 },
      }),
      runId,
      now: FIXED_NOW,
    });
    expect(doc.feedback.ioc_hit_count).toBe(0);
    expect(doc.feedback.affected_host_count).toBe(0);
    expect(doc.feedback.affected_user_count).toBe(0);
    expect(doc.corroborated_rank_score).toBeCloseTo(0.4, 6);
  });
});

describe('huntFeedbackWriteKeys / HUNT_FEEDBACK_OWNED_FIELDS (disjoint field-set)', () => {
  it('every key the writer ever emits is in the owned field-set allowlist', () => {
    const withScore = buildHuntFeedbackDoc({
      target: { index: 'i', id: '1', rankScore: 0.4 },
      tier1: tier1Hits(),
      runId: 'run-1',
      now: FIXED_NOW,
    });
    const withoutScore = buildHuntFeedbackDoc({
      target: { index: 'i', id: '1' },
      tier1: tier1NoHits(),
      runId: 'run-2',
      now: FIXED_NOW,
    });
    for (const doc of [withScore, withoutScore]) {
      for (const key of huntFeedbackWriteKeys(doc)) {
        expect(HUNT_FEEDBACK_OWNED_FIELDS).toContain(key);
      }
    }
  });
});

describe('writeHuntFeedback', () => {
  it('issues an _update with retry_on_conflict against the resolved backing index', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    await writeHuntFeedback(esClient, {
      target: { index: '.ds-foo-000001', id: 'report-1', rankScore: 0.4 },
      tier1: tier1Hits(),
      runId: 'run-1',
      now: FIXED_NOW,
    });
    expect(esClient.update).toHaveBeenCalledTimes(1);
    const [arg] = esClient.update.mock.calls[0];
    expect(arg.index).toBe('.ds-foo-000001');
    expect(arg.id).toBe('report-1');
    expect(arg.retry_on_conflict).toBe(3);
    const wireDoc = arg.doc as {
      feedback: { ioc_hit_count: number; last_hunt_run_id: string };
      corroborated_rank_score?: number;
    };
    expect(wireDoc.feedback.ioc_hit_count).toBe(7);
    expect(wireDoc.feedback.last_hunt_run_id).toBe('run-1');
    expect(typeof wireDoc.corroborated_rank_score).toBe('number');
  });

  it('rejects on ES failure (no log-and-swallow wrapper)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.update.mockRejectedValueOnce(new Error('version_conflict_engine_exception'));
    await expect(
      writeHuntFeedback(esClient, {
        target: { index: '.ds-foo-000001', id: 'report-1' },
        tier1: tier1Hits(),
        runId: 'run-1',
      })
    ).rejects.toThrow(/version_conflict_engine_exception/);
  });

  it('is idempotent: rerunning the same hunt converges on the same doc', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const inputs = {
      target: { index: '.ds-foo-000001', id: 'report-1', rankScore: 0.4 },
      tier1: tier1Hits(),
      runId: 'run-1',
      now: FIXED_NOW,
    };
    const first = await writeHuntFeedback(esClient, inputs);
    const second = await writeHuntFeedback(esClient, inputs);
    expect(second).toEqual(first);
  });
});

describe('resolveHuntFeedbackTarget', () => {
  const REPORTS_INDEX_PATTERN = '.kibana-threat-reports*';

  it('returns { index, id, rankScore } from the first matching hit, space-scoped', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 1, relation: 'eq' },
        max_score: 1,
        hits: [
          {
            _index: '.ds-.kibana-threat-reports-000001',
            _id: 'report-1',
            _score: 1,
            _source: { rank_score: 0.42 },
          },
        ],
      },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);

    const target = await resolveHuntFeedbackTarget(
      esClient,
      REPORTS_INDEX_PATTERN,
      'report-1',
      'default'
    );
    expect(target).toEqual({
      index: '.ds-.kibana-threat-reports-000001',
      id: 'report-1',
      rankScore: 0.42,
    });
    const [searchArg] = esClient.search.mock.calls[0];
    expect(searchArg).toMatchObject({
      query: {
        bool: {
          filter: [{ terms: { space_id: ['default', '*'] } }, { ids: { values: ['report-1'] } }],
        },
      },
    });
  });

  it('returns undefined when no document matches (stale id or out-of-space)', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);
    const target = await resolveHuntFeedbackTarget(
      esClient,
      REPORTS_INDEX_PATTERN,
      'missing-report',
      'default'
    );
    expect(target).toBeUndefined();
  });

  it('omits rankScore when the source document does not carry one', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.search.mockResolvedValueOnce({
      took: 1,
      timed_out: false,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      hits: {
        total: { value: 1, relation: 'eq' },
        max_score: 1,
        hits: [
          {
            _index: '.ds-.kibana-threat-reports-000002',
            _id: 'legacy-report',
            _score: 1,
            _source: {},
          },
        ],
      },
    } as unknown as Awaited<ReturnType<typeof esClient.search>>);
    const target = await resolveHuntFeedbackTarget(
      esClient,
      REPORTS_INDEX_PATTERN,
      'legacy-report',
      'default'
    );
    expect(target).toEqual({
      index: '.ds-.kibana-threat-reports-000002',
      id: 'legacy-report',
      rankScore: undefined,
    });
  });
});
