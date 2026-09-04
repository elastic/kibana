/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MOCK_INVESTIGATIONS,
  MOCK_PROPOSALS,
  SKILLS_SEED,
  WATCHES_SEED,
  WORKERS_SEED,
} from '../samples';
import type { Investigation, Proposal, Watch } from '.';
import {
  GetInvestigationResponse,
  GetWatchResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListWatchesResponse,
  WatchSkill,
  WatchWorker,
  Worker,
  WorkerSettings,
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
      const result = GetWatchResponse.parse({ watch });
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

  it('parses a live Worker without Worker-specific settings', () => {
    const worker = Worker.parse({
      id: 'system-security-hunt-continuous-threat-hunt',
      name: 'Continuous Threat Hunt',
      watchIds: ['system-security-watch-dark'],
      enabled: false,
      lastRun: null,
      state: 'paused',
      settings: {
        workerId: 'system-security-hunt-continuous-threat-hunt',
        autonomy: 'manual',
      },
      settingsRevision: null,
    });

    expect(WorkerSettings.parse(worker.settings)).toEqual(worker.settings);
    expect(worker.settings).toEqual({
      workerId: 'system-security-hunt-continuous-threat-hunt',
      autonomy: 'manual',
    });
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
});
