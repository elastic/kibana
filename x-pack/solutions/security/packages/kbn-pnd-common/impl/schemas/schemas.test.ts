/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_AUTONOMY_LEVELS } from '../../constants';
import {
  MOCK_INVESTIGATIONS,
  MOCK_PROPOSALS,
  SKILLS_SEED,
  WATCHES_SEED,
  WATCH_SETTINGS_SEED,
  WORKERS_SEED,
} from '../samples';
import type { Investigation, Proposal, Watch } from '.';
import {
  GetInvestigationResponse,
  GetWatchResponse,
  ListInvestigationProposalsResponse,
  ListInvestigationsResponse,
  ListWatchesResponse,
  WatchSettings,
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
      const result = GetWatchResponse.parse({ watch });
      expect(result.watch.id).toBe(watch.id);
    }
  });

  it('parses seed watch settings through WatchSettings', () => {
    for (const [watchId, settings] of Object.entries(WATCH_SETTINGS_SEED)) {
      // Ledger timestamps are stamped by the store, so drop the seed-only field before parsing.
      const { runsLedger, ...rest } = settings;
      const result = WatchSettings.parse({
        ...rest,
        runsLedger: runsLedger?.map(({ timeSecondsAgo, ...entry }) => ({
          ...entry,
          time: new Date().toISOString(),
        })),
      });
      expect(result.watchId).toBe(watchId);
      // One shared scale for every watch — only the selected level is per-watch.
      expect(WATCH_AUTONOMY_LEVELS).toContain(result.autonomy);
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

  // A catalog entry claims the watches it serves, and each watch lists what it attaches. The two
  // directions must agree, or the Workers/Skills pages and the per-watch tables disagree about
  // which watch uses what.
  it('keeps worker watchIds and per-watch worker attachments in agreement', () => {
    const watchIds = new Set(WATCHES_SEED.map(({ id }) => id));

    for (const worker of WORKERS_SEED) {
      for (const watchId of worker.watchIds) {
        expect(watchIds).toContain(watchId);
        expect(WATCH_SETTINGS_SEED[watchId]?.workers?.map(({ workerId }) => workerId)).toContain(
          worker.id
        );
      }

      for (const [watchId, settings] of Object.entries(WATCH_SETTINGS_SEED)) {
        if (settings.workers?.some(({ workerId }) => workerId === worker.id)) {
          expect(worker.watchIds).toContain(watchId);
        }
      }
    }
  });

  it('keeps skill watchIds and per-watch skill attachments in agreement', () => {
    const watchIds = new Set(WATCHES_SEED.map(({ id }) => id));

    for (const skill of SKILLS_SEED) {
      for (const watchId of skill.watchIds) {
        expect(watchIds).toContain(watchId);
        expect(WATCH_SETTINGS_SEED[watchId]?.skills?.map(({ skillId }) => skillId)).toContain(
          skill.id
        );
      }

      for (const [watchId, settings] of Object.entries(WATCH_SETTINGS_SEED)) {
        if (settings.skills?.some(({ skillId }) => skillId === skill.id)) {
          expect(skill.watchIds).toContain(watchId);
        }
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
