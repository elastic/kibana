/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SKILLS_SEED, WATCHES_SEED, WORKERS_SEED } from '../samples';
import type { Watch } from '.';
import {
  GetWatchResponse,
  ListWatchesResponse,
  WatchSkill,
  WatchWorker,
  RuleTuningWorkerExtras,
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
      id: 'system-security-hunt-continuous-threat-hunt',
      name: 'Continuous Threat Hunt',
      watchIds: ['system-security-watch-hunt'],
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

  it('rejects unknown top-level settings keys but leaves extras open on the wire', () => {
    expect(
      WorkerSettings.safeParse({
        workerId: 'system-security-dark-continuous-threat-hunt',
        autonomy: 'manual',
        unknownField: true,
      }).success
    ).toBe(false);
    expect(WorkerSettingsWrite.safeParse({ analysisWindowDays: 7 }).success).toBe(false);

    // Per-Worker strictness is applied by the complete schema, not the generic wire schema.
    expect(
      WorkerSettings.safeParse({
        workerId: 'system-security-detection-rule-tuning',
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 14 },
      }).success
    ).toBe(true);
    expect(WorkerSettingsWrite.safeParse({ extras: { anything: true } }).success).toBe(true);
  });

  it('closes the Detection-owned Rule Tuning extras', () => {
    expect(RuleTuningWorkerExtras.safeParse({}).success).toBe(false);
    expect(RuleTuningWorkerExtras.safeParse({ analysisWindowDays: 14, extra: 1 }).success).toBe(
      false
    );
    expect(RuleTuningWorkerExtras.safeParse({ analysisWindowDays: 14 }).success).toBe(true);
  });

  it.each([7.5, 0, 31])('rejects analysisWindowDays %s', (analysisWindowDays) => {
    expect(RuleTuningWorkerExtras.safeParse({ analysisWindowDays }).success).toBe(false);
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
});
