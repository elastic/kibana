/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_IDS,
  WorkerScheduleInterval,
  WorkerSettings,
} from '@kbn/alertzero-common';
import { SCHEDULED_INTERVAL_PATTERN } from '@kbn/workflows';
import { createWorkerSettingsRegistration } from './worker_settings';

const AD_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID;
const TRIAGE_WORKER_ID = SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID;

/** Every Worker except Attack Discovery is alert- or event-triggered and owns no schedule. */
const UNSCHEDULED_WORKER_IDS = SYSTEM_SECURITY_WORKER_IDS.filter((id) => id !== AD_WORKER_ID);

/** Only Alert Triage's autonomy cards reference detectionConfig at present. */
const NO_DETECTION_CONFIG_WORKER_IDS = SYSTEM_SECURITY_WORKER_IDS.filter(
  (id) => id !== TRIAGE_WORKER_ID
);

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

    it('defaults the interval for an install that predates the setting', () => {
      // scheduleInterval is additive, so an existing install simply has no such key.
      const { values } = registration.migrate({
        settingsVersion: 1,
        autonomyLevel: 'assisted',
      });

      expect(values).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'assisted',
        scheduleInterval: '24h',
      });
    });

    it('preserves a persisted interval', () => {
      expect(
        registration.migrate({
          settingsVersion: 1,
          autonomyLevel: 'manual',
          scheduleInterval: '30m',
        }).values
      ).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        scheduleInterval: '30m',
      });
    });

    it('throws on an unrecognised settings version', () => {
      expect(() => registration.migrate({ settingsVersion: 3, autonomyLevel: 'manual' })).toThrow(
        /Unsupported settings version/
      );
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
        { autonomyLevel: 'assisted' }
      );

      expect(applied).toEqual({
        values: { settingsVersion: 1, autonomyLevel: 'assisted', scheduleInterval: '15m' },
      });
    });
  });

  describe('schedule interval — the Workers that own no schedule', () => {
    it.each(UNSCHEDULED_WORKER_IDS)('%s default values omit the interval', (workerId) => {
      expect(createWorkerSettingsRegistration(workerId).createDefaultValues()).not.toHaveProperty(
        'scheduleInterval'
      );
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s omits the interval from public settings', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());

      expect(projected).not.toHaveProperty('scheduleInterval');
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s rejects an interval patch', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);

      expect(
        registration.applyPatch(registration.createDefaultValues(), { scheduleInterval: '30m' })
      ).toEqual({ rejected: 'a schedule interval' });
    });

    it.each(UNSCHEDULED_WORKER_IDS)('%s still accepts an autonomy patch', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const defaults = registration.createDefaultValues();

      expect(registration.applyPatch(defaults, { autonomyLevel: 'assisted' })).toEqual({
        values: { ...defaults, autonomyLevel: 'assisted' },
      });
    });
  });

  describe('detection config — alert triage (opted in)', () => {
    const registration = createWorkerSettingsRegistration(TRIAGE_WORKER_ID);

    it('defaults to confidence 0.85 / fpCount 10 and projects it', () => {
      expect(registration.createDefaultValues()).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        detectionConfig: { confidenceThreshold: 0.85, fpCountThreshold: 10 },
      });
      expect(registration.toSettings(registration.createDefaultValues())).toEqual({
        workerId: TRIAGE_WORKER_ID,
        autonomy: 'manual',
        detectionConfig: { confidenceThreshold: 0.85, fpCountThreshold: 10 },
      });
    });

    it('defaults the detection config for an install that predates the setting', () => {
      const { values } = registration.migrate({
        settingsVersion: 1,
        autonomyLevel: 'assisted',
      });

      expect(values).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'assisted',
        detectionConfig: { confidenceThreshold: 0.85, fpCountThreshold: 10 },
      });
    });

    it('preserves a persisted detection config', () => {
      expect(
        registration.migrate({
          settingsVersion: 1,
          autonomyLevel: 'manual',
          detectionConfig: { confidenceThreshold: 0.5, fpCountThreshold: 20 },
        }).values
      ).toEqual({
        settingsVersion: 1,
        autonomyLevel: 'manual',
        detectionConfig: { confidenceThreshold: 0.5, fpCountThreshold: 20 },
      });
    });

    it.each([
      [{ confidenceThreshold: 0 }, 'confidenceThreshold at the lower boundary'],
      [{ confidenceThreshold: 1 }, 'confidenceThreshold at the upper boundary'],
      [{ fpCountThreshold: 1 }, 'fpCountThreshold at the lower boundary'],
    ])('accepts %j (%s)', (partial, _description) => {
      expect(
        registration.migrate({
          settingsVersion: 1,
          autonomyLevel: 'manual',
          detectionConfig: { confidenceThreshold: 0.5, fpCountThreshold: 10, ...partial },
        }).values
      ).toEqual(
        expect.objectContaining({
          detectionConfig: { confidenceThreshold: 0.5, fpCountThreshold: 10, ...partial },
        })
      );
    });

    it.each([
      [{ confidenceThreshold: -0.01 }, 'confidenceThreshold below 0'],
      [{ confidenceThreshold: 1.01 }, 'confidenceThreshold above 1'],
      [{ fpCountThreshold: 0 }, 'fpCountThreshold below 1'],
      [{ fpCountThreshold: 1.5 }, 'fpCountThreshold not an integer'],
      [{ fpCountThreshold: -5 }, 'fpCountThreshold negative'],
    ])('rejects %j (%s)', (partial, _description) => {
      expect(() =>
        registration.migrate({
          settingsVersion: 1,
          autonomyLevel: 'manual',
          detectionConfig: { confidenceThreshold: 0.5, fpCountThreshold: 10, ...partial },
        })
      ).toThrow(/invalid detection config/);
    });

    it.each([
      [{ confidenceThreshold: 0.9 }, 'confidenceThreshold only'],
      [{ fpCountThreshold: 25 }, 'fpCountThreshold only'],
    ])('applies a %j patch, merging with the existing detection config', (patch, _description) => {
      const applied = registration.applyPatch(registration.createDefaultValues(), {
        detectionConfig: patch,
      });

      expect(applied).toEqual({
        values: {
          settingsVersion: 1,
          autonomyLevel: 'manual',
          detectionConfig: { confidenceThreshold: 0.85, fpCountThreshold: 10, ...patch },
        },
      });
    });

    it('leaves autonomy untouched when only the detection config is patched', () => {
      const applied = registration.applyPatch(
        {
          settingsVersion: 1,
          autonomyLevel: 'supervised',
          detectionConfig: { confidenceThreshold: 0.85, fpCountThreshold: 10 },
        },
        { detectionConfig: { confidenceThreshold: 0.6 } }
      );

      expect(applied).toEqual({
        values: {
          settingsVersion: 1,
          autonomyLevel: 'supervised',
          detectionConfig: { confidenceThreshold: 0.6, fpCountThreshold: 10 },
        },
      });
    });

    it('leaves the detection config untouched when only autonomy is patched', () => {
      const applied = registration.applyPatch(
        {
          settingsVersion: 1,
          autonomyLevel: 'manual',
          detectionConfig: { confidenceThreshold: 0.6, fpCountThreshold: 15 },
        },
        { autonomyLevel: 'assisted' }
      );

      expect(applied).toEqual({
        values: {
          settingsVersion: 1,
          autonomyLevel: 'assisted',
          detectionConfig: { confidenceThreshold: 0.6, fpCountThreshold: 15 },
        },
      });
    });
  });

  describe('detection config — the Workers that own no detection config', () => {
    it.each(NO_DETECTION_CONFIG_WORKER_IDS)('%s default values omit it', (workerId) => {
      expect(createWorkerSettingsRegistration(workerId).createDefaultValues()).not.toHaveProperty(
        'detectionConfig'
      );
    });

    it.each(NO_DETECTION_CONFIG_WORKER_IDS)('%s omits it from public settings', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const projected = registration.toSettings(registration.createDefaultValues());

      expect(projected).not.toHaveProperty('detectionConfig');
    });

    it.each(NO_DETECTION_CONFIG_WORKER_IDS)('%s rejects a detection config patch', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);

      expect(
        registration.applyPatch(registration.createDefaultValues(), {
          detectionConfig: { confidenceThreshold: 0.5 },
        })
      ).toEqual({ rejected: 'a detection config' });
    });

    it.each(NO_DETECTION_CONFIG_WORKER_IDS)('%s still accepts an autonomy patch', (workerId) => {
      const registration = createWorkerSettingsRegistration(workerId);
      const defaults = registration.createDefaultValues();

      expect(registration.applyPatch(defaults, { autonomyLevel: 'assisted' })).toEqual({
        values: { ...defaults, autonomyLevel: 'assisted' },
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
