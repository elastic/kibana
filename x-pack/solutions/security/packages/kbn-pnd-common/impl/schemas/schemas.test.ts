/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOCK_FP_TP_FAILURE,
  MOCK_FP_TP_INCONCLUSIVE_RESULT,
  MOCK_FP_TP_TRUE_POSITIVE_RESULT,
  MOCK_INVESTIGATIONS,
  MOCK_PROPOSALS,
  SKILLS_SEED,
  WATCHES_SEED,
  WORKERS_SEED,
} from '../samples';
import type { Investigation, Proposal, Watch } from '.';
import {
  FpTpFailure,
  FpTpResult,
  GetInvestigationResponse,
  GetWatchResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListWatchesResponse,
  WatchSkill,
  WatchWorker,
} from '.';

describe('PND schema smoke tests', () => {
  it('parses seed watches through ListWatchesResponse', () => {
    const result = ListWatchesResponse.parse({ watches: WATCHES_SEED });
    expect(result.watches).toHaveLength(5);
    result.watches.forEach((watch: Watch) => {
      expect(watch.tags).toContain('watch');
      expect(watch.managed).toBe(true);
    });
  });

  it('parses individual seed watches through GetWatchResponse', () => {
    for (const watch of WATCHES_SEED) {
      const result = GetWatchResponse.parse({ watch, settingsRevision: null });
      expect(result.watch.id).toBe(watch.id);
    }
  });

  it('parses seed workers through WatchWorker', () => {
    for (const { lastRunSecondsAgo, ...rest } of WORKERS_SEED) {
      const result = WatchWorker.parse({
        ...rest,
        lastRun: lastRunSecondsAgo == null ? null : new Date().toISOString(),
      });
      expect(result.watchIds.length).toBeGreaterThan(0);
    }
  });

  it('parses seed skills through WatchSkill', () => {
    for (const { lastRunSecondsAgo, ...rest } of SKILLS_SEED) {
      const result = WatchSkill.parse({
        ...rest,
        lastRun: lastRunSecondsAgo == null ? null : new Date().toISOString(),
      });
      expect(result.watchIds.length).toBeGreaterThan(0);
    }
  });

  it('keeps worker watch ids within the managed catalog', () => {
    const watchIds = new Set(WATCHES_SEED.map(({ id }) => id));

    for (const worker of WORKERS_SEED) {
      for (const watchId of worker.watchIds) {
        expect(watchIds).toContain(watchId);
      }
    }
  });

  it('keeps skill watch ids within the managed catalog', () => {
    const watchIds = new Set(WATCHES_SEED.map(({ id }) => id));

    for (const skill of SKILLS_SEED) {
      for (const watchId of skill.watchIds) {
        expect(watchIds).toContain(watchId);
      }
    }
  });

  it('parses mock investigations through ListInvestigationsResponse', () => {
    const result = ListInvestigationsResponse.parse({
      investigations: MOCK_INVESTIGATIONS,
      total: MOCK_INVESTIGATIONS.length,
    });
    expect(result.total).toBeGreaterThanOrEqual(8);
    result.investigations.forEach((inv: Investigation) => {
      expect(inv.template_id).toBe('investigation');
    });
  });

  it('parses mock proposals through ListInvestigationProposalsResponse', () => {
    const result = ListInvestigationProposalsResponse.parse({
      proposals: MOCK_PROPOSALS,
      total: MOCK_PROPOSALS.length,
    });
    expect(result.proposals.length).toBeGreaterThanOrEqual(8);
    result.proposals.forEach((prop: Proposal) => {
      expect(prop.template_id).toBe('proposal');
    });
  });

  it('parses investigation detail through GetInvestigationResponse', () => {
    const investigation = MOCK_INVESTIGATIONS[0];
    const result = GetInvestigationResponse.parse({ investigation });
    expect(result.investigation.id).toBe(investigation.id);
  });

  it('parses a true-positive FP/TP result through FpTpResult', () => {
    const result = FpTpResult.parse(MOCK_FP_TP_TRUE_POSITIVE_RESULT);
    expect(result.classification).toBe('true_positive');
  });

  it('parses an inconclusive FP/TP result through FpTpResult', () => {
    const result = FpTpResult.parse(MOCK_FP_TP_INCONCLUSIVE_RESULT);
    expect(result.classification).toBe('inconclusive');
  });

  it('parses an operational failure through FpTpFailure', () => {
    const result = FpTpFailure.parse(MOCK_FP_TP_FAILURE);
    expect(result.status).toBe('failed');
  });

  it('rejects a failed payload that also carries a classification', () => {
    expect(() =>
      FpTpFailure.parse({
        ...MOCK_FP_TP_FAILURE,
        classification: 'false_positive',
      })
    ).toThrow();
  });
});
