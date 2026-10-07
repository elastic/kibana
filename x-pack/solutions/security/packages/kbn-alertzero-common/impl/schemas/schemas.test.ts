/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_IDS } from '../../constants';
import { createCatalogWatchPlaceholder } from '../watches/watch_helpers';
import { RULE_TUNING_DEFAULT_EXTRAS } from '../worker_settings';
import type { Watch } from '.';
import {
  GetWatchResponse,
  ListWatchesResponse,
  RuleTuningWorkerExtras,
  UpdateWorkerRequestBody,
  Worker,
  WorkerSettings,
  WorkerSettingsWrite,
} from '.';

// The catalog placeholders are what the watches routes actually return for a not-installed
// Watch, so they are the right input for the response schemas.
const CATALOG_WATCHES = SYSTEM_SECURITY_WATCH_IDS.map(createCatalogWatchPlaceholder);

describe('AlertZero schema smoke tests', () => {
  it('parses catalog watches through ListWatchesResponse', () => {
    const result = ListWatchesResponse.parse({ watches: CATALOG_WATCHES });
    expect(result.watches).toHaveLength(SYSTEM_SECURITY_WATCH_IDS.length);
    result.watches.forEach((watch: Watch) => {
      expect(watch.tags).toContain('watch');
      expect(watch.managed).toBe(true);
    });
  });

  it('parses individual catalog watches through GetWatchResponse', () => {
    for (const watch of CATALOG_WATCHES) {
      const result = GetWatchResponse.parse({ watch });
      expect(result.watch.id).toBe(watch.id);
    }
  });

  it('parses a live Worker without Worker-specific settings', () => {
    const workerBody = {
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
      workflowId: null,
    };
    const worker = Worker.parse(workerBody);

    expect(WorkerSettings.parse(worker.settings)).toEqual(worker.settings);
    expect(worker.settings).toEqual({
      workerId: 'system-security-hunt-continuous-threat-hunt',
      autonomy: 'manual',
    });
    expect(worker.workflowId).toBeNull();
    expect(
      Worker.parse({ ...workerBody, workflowId: 'opaque-installed-workflow' }).workflowId
    ).toBe('opaque-installed-workflow');
    const { workflowId, ...withoutWorkflowId } = workerBody;
    expect(workflowId).toBeNull();
    expect(Worker.safeParse(withoutWorkflowId).success).toBe(false);
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
        extras: RULE_TUNING_DEFAULT_EXTRAS,
      }).success
    ).toBe(true);
    expect(WorkerSettingsWrite.safeParse({ extras: { anything: true } }).success).toBe(true);
  });

  it('closes the Detection-owned Rule Tuning extras', () => {
    expect(RuleTuningWorkerExtras.safeParse({}).success).toBe(false);
    expect(
      RuleTuningWorkerExtras.safeParse({ ...RULE_TUNING_DEFAULT_EXTRAS, extra: 1 }).success
    ).toBe(false);
    expect(RuleTuningWorkerExtras.safeParse(RULE_TUNING_DEFAULT_EXTRAS).success).toBe(true);
  });

  it.each(['analysisWindowDays', 'fpCountThreshold', 'fpRateThresholdPct'] as const)(
    'rejects Rule Tuning extras missing %s',
    (missing) => {
      const incomplete: Record<string, number> = { ...RULE_TUNING_DEFAULT_EXTRAS };
      delete incomplete[missing];

      expect(RuleTuningWorkerExtras.safeParse(incomplete).success).toBe(false);
    }
  );

  // Each field: a non-integer, one below its floor, one above its ceiling.
  it.each([
    ['analysisWindowDays', [7.5, 0, 31]],
    ['fpCountThreshold', [1.5, 1, 101]],
    ['fpRateThresholdPct', [50.5, -1, 101]],
  ] as const)('rejects out-of-range %s', (field, values) => {
    for (const value of values) {
      expect(
        RuleTuningWorkerExtras.safeParse({ ...RULE_TUNING_DEFAULT_EXTRAS, [field]: value }).success
      ).toBe(false);
    }
  });

  it.each([
    [2, 100],
    [100, 0],
  ])('accepts fpCountThreshold %s and fpRateThresholdPct %s at the bounds', (count, rate) => {
    expect(
      RuleTuningWorkerExtras.safeParse({
        ...RULE_TUNING_DEFAULT_EXTRAS,
        fpCountThreshold: count,
        fpRateThresholdPct: rate,
      }).success
    ).toBe(true);
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
});
