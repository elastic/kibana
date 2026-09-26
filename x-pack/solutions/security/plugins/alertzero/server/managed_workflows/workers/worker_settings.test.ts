/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_TUNING_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  WorkerScheduleInterval,
  WorkerSettings,
} from '@kbn/alertzero-common';
import { SCHEDULED_INTERVAL_PATTERN } from '@kbn/workflows';
import { createWorkerSettingsRegistration } from './worker_settings';
import type { RegisteredWorkerId } from '../worker_registry';

const AD_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const RULE_TUNING_WORKER_ID = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;
const FORENSICS_WORKER_ID = SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID;

const SCHEDULED_WORKER_IDS: string[] = [AD_WORKER_ID, RULE_TUNING_WORKER_ID];

const UNSCHEDULED_WORKER_IDS = SYSTEM_SECURITY_WORKER_IDS.filter(
  (id) => !SCHEDULED_WORKER_IDS.includes(id)
);

/** Workers that allow only manual autonomy, so any other level is rejected. */
const MANUAL_ONLY_WORKER_IDS: string[] = [FORENSICS_WORKER_ID];

const expectInvalid = (
  applied: ReturnType<ReturnType<typeof createWorkerSettingsRegistration>['applyPatch']>
): string => {
  if (!('invalid' in applied)) {
    throw new Error('Expected the patch to be rejected');
  }
  return applied.invalid;
};

describe('createWorkerSettingsRegistration', () => {
  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s defaults round-trip through the public WorkerSettings schema',
    (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());

      expect(WorkerSettings.parse(projected)).toEqual(projected);
      expect(projected).toEqual(
        expect.objectContaining({
          workerId,
          autonomy: 'manual',
        })
      );
    }
  );

  it.each([...SYSTEM_SECURITY_WORKER_IDS])(
    '%s does not silently strip projected keys',
    (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());
      const parsed = WorkerSettings.parse(projected);

      expect(Object.keys(parsed).sort()).toEqual(Object.keys(projected).sort());
      expect(parsed).toEqual(projected);
    }
  );

  describe('schedule interval — attack discovery (opted in)', () => {
    const registration = createWorkerSettingsRegistration(AD_WORKER_ID);

    it('defaults to 24h at the current settings version and projects it', () => {
      expect(registration.createDefaultValues()).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '24h',
      });
      expect(registration.toSettings(registration.createDefaultValues())).toEqual({
        workerId: AD_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '24h',
      });
    });

    it('fills a missing schedule interval from the declaration default', () => {
      const stored = { settingsVersion: 1, autonomyLevel: 'manual' };

      expect(registration.migrateStoredValues(stored)).toEqual({
        ...stored,
        scheduleInterval: '24h',
      });
      expect(registration.toSettings(stored)).toEqual({
        workerId: AD_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '24h',
      });
    });

    it('reads a persisted interval back as stored', () => {
      expect(
        registration.toSettings({
          settingsVersion: 1,
          autonomyLevel: 'manual',
          scheduleInterval: '30m',
        })
      ).toEqual({ workerId: AD_WORKER_ID, autonomy: 'manual', scheduleInterval: '30m' });
    });

    it('throws on an unrecognised settings version', () => {
      expect(() =>
        registration.toSettings({
          settingsVersion: 3,
          autonomyLevel: 'manual',
          scheduleInterval: '24h',
        })
      ).toThrow(/Unsupported settings version/);
    });

    it('throws on a stored autonomy level outside the shared scale', () => {
      expect(() =>
        registration.toSettings({
          settingsVersion: 1,
          autonomyLevel: 'yolo',
          scheduleInterval: '24h',
        })
      ).toThrow(/settings are invalid: autonomy/);
    });

    it('rewrites a stored level this Worker no longer offers so the document can be saved', () => {
      const stored = { settingsVersion: 1, autonomyLevel: 'assisted', scheduleInterval: '24h' };

      expect(registration.migrateStoredValues(stored)).toEqual({
        ...stored,
        autonomyLevel: 'manual',
      });
    });

    it('reads a stored level this Worker no longer offers as the closest one it does', () => {
      // Attack Discovery dropped its assisted gate; a document written while it existed must not
      // strand the Worker as unreadable, and must not be read as MORE autonomous than stored.
      expect(
        registration.toSettings({
          settingsVersion: 1,
          autonomyLevel: 'assisted',
          scheduleInterval: '24h',
        })
      ).toEqual({ workerId: AD_WORKER_ID, autonomy: 'manual', scheduleInterval: '24h' });
    });

    it('leaves a stored level this Worker does offer alone', () => {
      expect(
        registration.toSettings({
          settingsVersion: 1,
          autonomyLevel: 'supervised',
          scheduleInterval: '24h',
        })
      ).toEqual({ workerId: AD_WORKER_ID, autonomy: 'supervised', scheduleInterval: '24h' });
    });

    it('rejects unsupported stored fields by name', () => {
      expect(() =>
        registration.toSettings({
          settingsVersion: 1,
          autonomyLevel: 'manual',
          scheduleInterval: '24h',
          candidateLimit: 5,
        })
      ).toThrow(/unsupported fields: candidateLimit/);
    });

    it.each(['1m', '2h', '7d'])('applies a %s interval patch', (scheduleInterval) => {
      const applied = registration.applyPatch(registration.createDefaultValues(), {
        scheduleInterval,
      });

      expect(applied).toEqual({
        values: { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval },
      });
    });

    it('leaves autonomy untouched when only the interval is patched', () => {
      const applied = registration.applyPatch(
        { settingsVersion: 1, autonomyLevel: 'supervised', scheduleInterval: '24h' },
        { scheduleInterval: '15m' }
      );

      expect(applied).toEqual({
        values: { settingsVersion: 1, autonomyLevel: 'supervised', scheduleInterval: '15m' },
      });
    });

    // `supervised` rather than `assisted`: this worker gates exactly one thing, so it
    // allows only `manual` and `supervised`. The interval is what is under test here,
    // but the patch still has to be one the worker would accept.
    it('leaves the interval untouched when only autonomy is patched', () => {
      const applied = registration.applyPatch(
        { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '15m' },
        { autonomy: 'supervised' }
      );

      expect(applied).toEqual({
        values: { settingsVersion: 1, autonomyLevel: 'supervised', scheduleInterval: '15m' },
      });
    });

    it('rejects an autonomy patch outside the levels this Worker allows', () => {
      // Attack Discovery has no assisted gate, so the patch is refused rather than stored.
      const applied = registration.applyPatch(
        { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '15m' },
        { autonomy: 'assisted' }
      );

      expect(applied).toMatchObject({
        invalid: expect.stringContaining('autonomy'),
      });
    });
  });

  describe('Worker-specific settings — detection rule tuning', () => {
    const registration = createWorkerSettingsRegistration(RULE_TUNING_WORKER_ID);
    const defaultExtras = RULE_TUNING_DEFAULT_EXTRAS;
    const storedDefaults = {
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleInterval: '2h',
      extras: defaultExtras,
    };

    it('stores extras nested and projects them under settings.extras', () => {
      expect(registration.createDefaultValues()).toEqual(storedDefaults);
      expect(registration.toSettings(registration.createDefaultValues())).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: defaultExtras,
      });
    });

    it('fills extras from defaults when a stored document has none', () => {
      const stored = {
        settingsVersion: 1,
        autonomyLevel: 'assisted',
        scheduleInterval: '2h',
      };

      expect(registration.migrateStoredValues(stored)).toEqual({
        ...stored,
        extras: defaultExtras,
      });
      expect(registration.toSettings(stored)).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'assisted',
        scheduleInterval: '2h',
        extras: defaultExtras,
      });
    });

    it('upgrades a version-4 document without extras onto the current defaults', () => {
      // The shape installed before extras existed: settings version, autonomy, and interval only.
      const stored = {
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '2h',
      };

      expect(registration.migrateStoredValues(stored)).toEqual({
        ...stored,
        extras: defaultExtras,
      });
      expect(registration.toSettings(stored)).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: defaultExtras,
      });
    });

    it('fills only the extras keys an older document does not have', () => {
      const stored = {
        ...storedDefaults,
        extras: { analysisWindowDays: 21 },
      };

      expect(registration.migrateStoredValues(stored)).toEqual({
        ...storedDefaults,
        extras: { ...defaultExtras, analysisWindowDays: 21 },
      });
      expect(registration.toSettings(stored)).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { ...defaultExtras, analysisWindowDays: 21 },
      });
    });

    it('leaves a complete extras object untouched', () => {
      expect(registration.migrateStoredValues(storedDefaults)).toBe(storedDefaults);
    });

    it('rewrites a stored supervised level to assisted so the document can be saved', () => {
      expect(
        registration.migrateStoredValues({ ...storedDefaults, autonomyLevel: 'supervised' })
      ).toEqual({ ...storedDefaults, autonomyLevel: 'assisted' });
    });

    it('reads a stored supervised level as assisted, the closest level it still offers', () => {
      // Rule Tuning has no unattended level: the document written while it did stays readable.
      expect(registration.toSettings({ ...storedDefaults, autonomyLevel: 'supervised' })).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'assisted',
        scheduleInterval: '2h',
        extras: defaultExtras,
      });
    });

    it('persists the projected level on the next save, so the document heals', () => {
      expect(
        registration.applyPatch(
          { ...storedDefaults, autonomyLevel: 'supervised' },
          { scheduleInterval: '6h' }
        )
      ).toEqual({
        values: { ...storedDefaults, autonomyLevel: 'assisted', scheduleInterval: '6h' },
      });
    });

    it('fills every extras key when the stored object is empty', () => {
      const stored = { ...storedDefaults, extras: {} };

      expect(registration.migrateStoredValues(stored)).toEqual(storedDefaults);
      expect(registration.toSettings(stored)).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: defaultExtras,
      });
    });

    it('persists default extras when a shared-field patch is applied to a document that has none', () => {
      expect(
        registration.applyPatch(
          { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '2h' },
          { scheduleInterval: '6h' }
        )
      ).toEqual({
        values: { ...storedDefaults, scheduleInterval: '6h' },
      });
    });

    it('keeps extras when a shared-field patch omits them', () => {
      expect(registration.applyPatch(storedDefaults, { scheduleInterval: '6h' })).toEqual({
        values: { ...storedDefaults, scheduleInterval: '6h' },
      });
    });

    it('replaces extras whole when the patch supplies them', () => {
      // Seeded at a level this Worker allows (manual/assisted); the assertion is about extras.
      expect(
        registration.applyPatch(
          { ...storedDefaults, autonomyLevel: 'assisted' },
          { extras: { ...defaultExtras, analysisWindowDays: 21 } }
        )
      ).toEqual({
        values: {
          ...storedDefaults,
          autonomyLevel: 'assisted',
          extras: { ...defaultExtras, analysisWindowDays: 21 },
        },
      });
    });

    it('rejects an extras replacement missing a required field, naming it', () => {
      expect(expectInvalid(registration.applyPatch(storedDefaults, { extras: {} }))).toContain(
        'extras.analysisWindowDays'
      );
    });

    it('rejects an unknown extras key, naming it', () => {
      expect(
        expectInvalid(
          registration.applyPatch(storedDefaults, {
            extras: { ...defaultExtras, previewDepth: 3 },
          })
        )
      ).toMatch(/extras.*previewDepth/);
    });

    it('does not replace a present invalid extras value when filling the rest', () => {
      expect(() =>
        registration.toSettings({
          ...storedDefaults,
          extras: { analysisWindowDays: 0 },
        })
      ).toThrow(/extras\.analysisWindowDays/);
    });

    it.each([7.5, 0, 31])('rejects a stored analysis window of %s', (analysisWindowDays) => {
      expect(() =>
        registration.toSettings({
          ...storedDefaults,
          extras: { ...defaultExtras, analysisWindowDays },
        })
      ).toThrow(/extras\.analysisWindowDays/);
    });

    it.each([1, 101, 10.5])('rejects a stored FP count threshold of %s', (fpCountThreshold) => {
      expect(() =>
        registration.toSettings({
          ...storedDefaults,
          extras: { ...defaultExtras, fpCountThreshold },
        })
      ).toThrow(/extras\.fpCountThreshold/);
    });

    it.each([-1, 101, 50.5])('rejects a stored FP rate threshold of %s', (fpRateThresholdPct) => {
      expect(() =>
        registration.toSettings({
          ...storedDefaults,
          extras: { ...defaultExtras, fpRateThresholdPct },
        })
      ).toThrow(/extras\.fpRateThresholdPct/);
    });

    it.each(['fpCountThreshold', 'fpRateThresholdPct'] as const)(
      'rejects an extras replacement missing %s, naming it',
      (missing) => {
        const extras: Record<string, number> = { ...defaultExtras };
        delete extras[missing];

        expect(expectInvalid(registration.applyPatch(storedDefaults, { extras }))).toContain(
          `extras.${missing}`
        );
      }
    );
  });

  describe('Workers that declare no extras', () => {
    it.each([...UNSCHEDULED_WORKER_IDS, AD_WORKER_ID])(
      "%s rejects another Worker's extras field, naming it",
      (workerId) => {
        const registration = createWorkerSettingsRegistration(workerId);

        expect(
          expectInvalid(
            registration.applyPatch(registration.createDefaultValues(), {
              extras: { analysisWindowDays: 7 },
            })
          )
        ).toMatch(/extras/);
      }
    );
  });

  describe('schedule interval — the Workers that own no schedule', () => {
    it.each(UNSCHEDULED_WORKER_IDS)('%s default values are unchanged', (workerId) => {
      expect(createWorkerSettingsRegistration(workerId).createDefaultValues()).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
      });
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s omits the interval from public settings', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());

      expect(projected).not.toHaveProperty('scheduleInterval');
      expect(projected).not.toHaveProperty('extras');
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s drops a stored schedule interval', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const stored = { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '30m' };

      expect(registration.migrateStoredValues(stored)).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
      });
      expect(registration.toSettings(stored)).not.toHaveProperty('scheduleInterval');
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s rejects an interval patch, naming it', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);

      expect(
        expectInvalid(
          registration.applyPatch(registration.createDefaultValues(), { scheduleInterval: '30m' })
        )
      ).toContain('scheduleInterval');
    });

    it.each(UNSCHEDULED_WORKER_IDS.filter((id) => !MANUAL_ONLY_WORKER_IDS.includes(id)))(
      '%s still accepts an autonomy patch',
      (workerId) => {
        const registration = createWorkerSettingsRegistration(workerId);

        expect(
          registration.applyPatch(registration.createDefaultValues(), { autonomy: 'assisted' })
        ).toEqual({ values: { settingsVersion: 1, autonomyLevel: 'assisted' } });
      }
    );
  });

  describe('Workers that allow only manual autonomy', () => {
    it.each(MANUAL_ONLY_WORKER_IDS)('%s rejects a higher level, naming the field', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId as RegisteredWorkerId);

      expect(
        expectInvalid(
          registration.applyPatch(registration.createDefaultValues(), { autonomy: 'assisted' })
        )
      ).toContain('autonomy');
    });

    it.each(MANUAL_ONLY_WORKER_IDS)('%s still defaults to manual', (workerId) => {
      expect(
        createWorkerSettingsRegistration(workerId as RegisteredWorkerId).createDefaultValues()
      ).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
      });
    });
  });
});

describe('WorkerScheduleInterval API schema', () => {
  // The OpenAPI pattern is a literal in watch_settings.schema.yaml because a .schema.yaml cannot
  // import a TS constant. This keeps that copy a strict subset of what the workflow engine accepts,
  // so no value the API admits can fail at schedule-registration time.
  it.each(['1m', '2h', '365d'])(
    'accepts %p, which the workflow engine also accepts',
    (interval) => {
      expect(WorkerScheduleInterval.safeParse(interval).success).toBe(true);
      expect(SCHEDULED_INTERVAL_PATTERN.test(interval)).toBe(true);
    }
  );

  it.each(['0m', '60s', 'abc', '1000000d'])('rejects %p', (interval) => {
    expect(WorkerScheduleInterval.safeParse(interval).success).toBe(false);
  });
});
