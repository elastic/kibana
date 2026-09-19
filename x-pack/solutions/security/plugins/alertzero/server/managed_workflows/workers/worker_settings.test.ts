/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  WorkerScheduleInterval,
  WorkerSettings,
} from '@kbn/alertzero-common';
import { SCHEDULED_INTERVAL_PATTERN } from '@kbn/workflows';
import { createWorkerSettingsRegistration } from './worker_settings';

const AD_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const RULE_TUNING_WORKER_ID = SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID;

const SCHEDULED_WORKER_IDS: string[] = [AD_WORKER_ID, RULE_TUNING_WORKER_ID];

/** Every other Worker is alert- or event-triggered and owns no schedule. */
const UNSCHEDULED_WORKER_IDS = SYSTEM_SECURITY_WORKER_IDS.filter(
  (id) => !SCHEDULED_WORKER_IDS.includes(id)
);

/**
 * Stored defaults per unscheduled Worker. Owning no schedule is all these Workers have in
 * common: Alert Triage also carries Watch-owned `extras` and a bumped settings version, and
 * both change what already-installed spaces receive, so they are spelled out rather than
 * assumed uniform.
 */
const UNSCHEDULED_WORKER_DEFAULTS = new Map<string, Record<string, unknown>>([
  [
    SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    {
      settingsVersion: 2,
      autonomyLevel: 'manual',
      extras: { autoCloseConfidenceScoreMinThreshold: 0.85 },
    },
  ],
]);

const storedDefaultsFor = (workerId: string): Record<string, unknown> =>
  UNSCHEDULED_WORKER_DEFAULTS.get(workerId) ?? { settingsVersion: 1, autonomyLevel: 'manual' };

/** Workers whose stored values carry no `extras` at all. */
const NO_EXTRAS_WORKER_IDS = UNSCHEDULED_WORKER_IDS.filter(
  (id) => !UNSCHEDULED_WORKER_DEFAULTS.has(id)
);

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

    it('rejects stored values missing the declared schedule interval', () => {
      // No defaulting of older development state: the document has to be reset.
      expect(() =>
        registration.toSettings({ settingsVersion: 1, autonomyLevel: 'assisted' })
      ).toThrow(/scheduleInterval/);
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

    it('leaves the interval untouched when only autonomy is patched', () => {
      const applied = registration.applyPatch(
        { settingsVersion: 1, autonomyLevel: 'manual', scheduleInterval: '15m' },
        { autonomy: 'assisted' }
      );

      expect(applied).toEqual({
        values: { settingsVersion: 1, autonomyLevel: 'assisted', scheduleInterval: '15m' },
      });
    });
  });

  describe('Worker-specific settings — detection rule tuning', () => {
    const registration = createWorkerSettingsRegistration(RULE_TUNING_WORKER_ID);
    const storedDefaults = {
      settingsVersion: 1,
      autonomyLevel: 'manual',
      scheduleInterval: '2h',
      extras: { analysisWindowDays: 14 },
    };

    it('stores extras nested and projects them under settings.extras', () => {
      expect(registration.createDefaultValues()).toEqual(storedDefaults);
      expect(registration.toSettings(registration.createDefaultValues())).toEqual({
        workerId: RULE_TUNING_WORKER_ID,
        autonomy: 'manual',
        scheduleInterval: '2h',
        extras: { analysisWindowDays: 14 },
      });
    });

    it('rejects stored values missing extras', () => {
      expect(() =>
        registration.toSettings({
          settingsVersion: 1,
          autonomyLevel: 'assisted',
          scheduleInterval: '2h',
        })
      ).toThrow(/extras/);
    });

    it('rejects stored extras missing a required field, naming it', () => {
      // No default repair: a document written before the field existed has to be reset.
      expect(() => registration.toSettings({ ...storedDefaults, extras: {} })).toThrow(
        /extras\.analysisWindowDays/
      );
    });

    it('keeps extras when a shared-field patch omits them', () => {
      expect(registration.applyPatch(storedDefaults, { scheduleInterval: '6h' })).toEqual({
        values: { ...storedDefaults, scheduleInterval: '6h' },
      });
    });

    it('replaces extras whole when the patch supplies them', () => {
      expect(
        registration.applyPatch(
          { ...storedDefaults, autonomyLevel: 'supervised' },
          { extras: { analysisWindowDays: 7 } }
        )
      ).toEqual({
        values: {
          ...storedDefaults,
          autonomyLevel: 'supervised',
          extras: { analysisWindowDays: 7 },
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
            extras: { analysisWindowDays: 14, previewDepth: 3 },
          })
        )
      ).toMatch(/extras.*previewDepth/);
    });

    it.each([7.5, 0, 31])('rejects a stored analysis window of %s', (analysisWindowDays) => {
      expect(() =>
        registration.toSettings({ ...storedDefaults, extras: { analysisWindowDays } })
      ).toThrow(/extras\.analysisWindowDays/);
    });
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
      expect(createWorkerSettingsRegistration(workerId).createDefaultValues()).toEqual(
        storedDefaultsFor(workerId)
      );
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s omits the interval from public settings', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());

      expect(projected).not.toHaveProperty('scheduleInterval');
    });

    it.each(NO_EXTRAS_WORKER_IDS)('%s projects no extras either', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);

      expect(registration.toSettings(registration.createDefaultValues())).not.toHaveProperty(
        'extras'
      );
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s rejects a stored schedule interval by name', (workerId) => {
      expect(() =>
        createWorkerSettingsRegistration(workerId).toSettings({
          ...storedDefaultsFor(workerId),
          scheduleInterval: '30m',
        })
      ).toThrow(/scheduleInterval/);
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s rejects an interval patch, naming it', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);

      expect(
        expectInvalid(
          registration.applyPatch(registration.createDefaultValues(), { scheduleInterval: '30m' })
        )
      ).toContain('scheduleInterval');
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s still accepts an autonomy patch', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);

      expect(
        registration.applyPatch(registration.createDefaultValues(), { autonomy: 'assisted' })
      ).toEqual({ values: { ...storedDefaultsFor(workerId), autonomyLevel: 'assisted' } });
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
