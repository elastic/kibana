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
  RuleTuningWorkerSettings,
  UpdateWorkerRequestBody,
  Worker,
  WorkerSettings,
  WorkerSettingsWrite,
} from '.';

describe('AlertZero schema smoke tests', () => {
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
      id: 'system-security-dark-continuous-threat-hunt',
      name: 'Continuous Threat Hunt',
      watchIds: ['system-security-watch-dark'],
      enabled: false,
      lastRun: null,
      state: 'paused',
      allowedAutonomyLevels: ['manual', 'assisted', 'supervised'],
      settings: {
        workerId: 'system-security-dark-continuous-threat-hunt',
        autonomy: 'manual',
      },
      settingsRevision: null,
    });

    expect(WorkerSettings.parse(worker.settings)).toEqual(worker.settings);
    expect(worker.settings).toEqual({
      workerId: 'system-security-dark-continuous-threat-hunt',
      autonomy: 'manual',
    });
  });

  it('rejects unknown settings keys and incomplete Rule Tuning settings', () => {
    expect(
      WorkerSettings.safeParse({
        workerId: 'system-security-dark-continuous-threat-hunt',
        autonomy: 'manual',
        unknownField: true,
      }).success
    ).toBe(false);

    expect(
      RuleTuningWorkerSettings.safeParse({
        workerId: 'system-security-detection-rule-tuning',
        autonomy: 'manual',
        scheduleInterval: '2h',
      }).success
    ).toBe(false);

    expect(
      RuleTuningWorkerSettings.safeParse({
        workerId: 'system-security-detection-rule-tuning',
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 14 },
      }).success
    ).toBe(true);

    // The pre-extras flat shape must no longer validate — a stored value at the old path
    // would silently never reach the workflow input.
    expect(
      RuleTuningWorkerSettings.safeParse({
        workerId: 'system-security-detection-rule-tuning',
        autonomy: 'manual',
        scheduleInterval: '2h',
        analysisWindowDays: 14,
      }).success
    ).toBe(false);
  });

  it.each([7.5, 0, 31])(
    'rejects extras analysisWindowDays %s on the write schema',
    (analysisWindowDays) => {
      expect(WorkerSettingsWrite.safeParse({ extras: { analysisWindowDays } }).success).toBe(false);
    }
  );

  it('rejects analysisWindowDays at the old top level on the write schema', () => {
    expect(WorkerSettingsWrite.safeParse({ analysisWindowDays: 14 }).success).toBe(false);
  });

  it('rejects leftover top-level settings fields on the update body', () => {
    expect(
      UpdateWorkerRequestBody.safeParse({
        settingsRevision: 1,
        autonomyLevel: 'assisted',
      }).success
    ).toBe(false);
    expect(
      UpdateWorkerRequestBody.safeParse({
        settingsRevision: 1,
        settings: { autonomy: 'assisted' },
      }).success
    ).toBe(true);
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

  it('parses a live Worker settings object carrying Worker-owned extras', () => {
    const worker = Worker.parse({
      id: 'system-security-detection-rule-tuning',
      name: 'Rule Tuning',
      watchIds: ['system-security-watch-detection'],
      enabled: true,
      lastRun: null,
      state: 'ok',
      allowedAutonomyLevels: ['manual', 'assisted', 'supervised'],
      settings: {
        workerId: 'system-security-detection-rule-tuning',
        autonomy: 'manual',
        scheduleInterval: '24h',
        extras: { analysisWindowDays: 7 },
      },
      settingsRevision: 0,
    });

    expect(WorkerSettings.parse(worker.settings)).toEqual(worker.settings);
    expect(worker.settings).toEqual({
      workerId: 'system-security-detection-rule-tuning',
      autonomy: 'manual',
      scheduleInterval: '24h',
      extras: { analysisWindowDays: 7 },
    });
  });

  describe('WorkerSettings extras (decisions-3 item 5)', () => {
    const base = {
      workerId: 'system-security-detection-rule-tuning',
      autonomy: 'manual' as const,
    };

    it('accepts a Worker settings object with no extras at all', () => {
      expect(WorkerSettings.safeParse(base).success).toBe(true);
    });

    it.each([
      [1, 'analysisWindowDays at the lower boundary'],
      [30, 'analysisWindowDays at the upper boundary'],
      [7, 'analysisWindowDays mid-range'],
    ])('accepts extras %p — %s', (analysisWindowDays) => {
      expect(WorkerSettings.safeParse({ ...base, extras: { analysisWindowDays } }).success).toBe(
        true
      );
    });

    it.each([0, 31, 1.5, '7'])(
      'rejects extras analysisWindowDays %p (out of range or wrong type)',
      (analysisWindowDays) => {
        expect(WorkerSettings.safeParse({ ...base, extras: { analysisWindowDays } }).success).toBe(
          false
        );
      }
    );

    it('rejects an unknown extras key and names the offending field', () => {
      const result = WorkerSettings.safeParse({
        ...base,
        extras: { analysisWindowDayz: 7 },
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected a misspelled extras key to be rejected');
      // The error must name the field so a client can report which key was wrong, rather
      // than failing with an opaque "invalid settings".
      expect(JSON.stringify(result.error.issues)).toContain('analysisWindowDayz');
    });

    it('rejects an unknown top-level settings key', () => {
      expect(
        WorkerSettings.safeParse({ ...base, detectionConfig: { confidenceThreshold: 0.5 } }).success
      ).toBe(false);
    });
  });

  describe('Worker.allowedAutonomyLevels (decisions-3 item 3)', () => {
    const worker = {
      id: 'system-security-floor-alert-triage',
      name: 'Alert Triage',
      watchIds: ['system-security-watch-floor'],
      enabled: true,
      lastRun: null,
      state: 'ok' as const,
      settings: { workerId: 'system-security-floor-alert-triage', autonomy: 'manual' as const },
      settingsRevision: 0,
    };

    it('requires the allowed set on every projected Worker', () => {
      expect(Worker.safeParse(worker).success).toBe(false);
    });

    it('accepts a narrowed single-level set', () => {
      expect(Worker.safeParse({ ...worker, allowedAutonomyLevels: ['manual'] }).success).toBe(true);
    });

    it('rejects an empty allowed set — a Worker always supports at least one level', () => {
      expect(Worker.safeParse({ ...worker, allowedAutonomyLevels: [] }).success).toBe(false);
    });

    it('rejects an unknown autonomy level in the allowed set', () => {
      expect(Worker.safeParse({ ...worker, allowedAutonomyLevels: ['autopilot'] }).success).toBe(
        false
      );
    });
  });
});
