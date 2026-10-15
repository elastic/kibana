/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RULE_TUNING_DEFAULT_EXTRAS,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import { buildWorkerSettingsChangedPayloads } from './build_worker_settings_changed_payloads';

const ATTACK_DISCOVERY_SETTINGS: WorkerSettings = {
  autonomy: 'manual',
  scheduleInterval: '24h',
  workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
};

const RULE_TUNING_SETTINGS: WorkerSettings = {
  autonomy: 'manual',
  extras: RULE_TUNING_DEFAULT_EXTRAS,
  scheduleInterval: '2h',
  workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
};

describe('buildWorkerSettingsChangedPayloads', () => {
  it('returns no payload when nothing changed', () => {
    expect(
      buildWorkerSettingsChangedPayloads({
        settings: {
          next: { ...ATTACK_DISCOVERY_SETTINGS },
          previous: ATTACK_DISCOVERY_SETTINGS,
        },
        settingsRevision: 3,
        spaceId: 'default',
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      })
    ).toEqual([]);
  });

  it('returns one autonomy payload carrying the raw previous and next levels', () => {
    expect(
      buildWorkerSettingsChangedPayloads({
        settings: {
          next: { ...ATTACK_DISCOVERY_SETTINGS, autonomy: 'supervised' },
          previous: ATTACK_DISCOVERY_SETTINGS,
        },
        settingsRevision: 3,
        spaceId: 'default',
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      })
    ).toEqual([
      {
        bulk_write: false,
        is_default_space: true,
        next_value: 'supervised',
        previous_value: 'manual',
        setting: 'autonomy',
        settings_revision: 3,
        watch_tag: 'watch-floor',
        worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      },
    ]);
  });

  it('ships a schedule change as interval buckets, never the raw interval', () => {
    const [payload] = buildWorkerSettingsChangedPayloads({
      settings: {
        next: { ...ATTACK_DISCOVERY_SETTINGS, scheduleInterval: '15m' },
        previous: ATTACK_DISCOVERY_SETTINGS,
      },
      settingsRevision: 3,
      spaceId: 'default',
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    });

    expect(payload).toEqual(
      expect.objectContaining({
        next_value: '15m_to_lt_1h',
        previous_value: '24h_to_lt_7d',
        setting: 'schedule_interval',
      })
    );
  });

  it('still reports a schedule change that stays inside one bucket', () => {
    const payloads = buildWorkerSettingsChangedPayloads({
      settings: {
        next: { ...RULE_TUNING_SETTINGS, scheduleInterval: '3h' },
        previous: RULE_TUNING_SETTINGS,
      },
      settingsRevision: 3,
      spaceId: 'default',
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    });

    expect(payloads).toEqual([
      expect.objectContaining({
        next_value: '1h_to_lt_6h',
        previous_value: '1h_to_lt_6h',
        setting: 'schedule_interval',
      }),
    ]);
  });

  it('returns one payload per changed setting, in a stable order, each marked as a bulk write', () => {
    const payloads = buildWorkerSettingsChangedPayloads({
      settings: {
        next: {
          ...RULE_TUNING_SETTINGS,
          autonomy: 'assisted',
          extras: { ...RULE_TUNING_DEFAULT_EXTRAS, analysisWindowDays: 21 },
          scheduleInterval: '6h',
        },
        previous: RULE_TUNING_SETTINGS,
      },
      settingsRevision: 5,
      spaceId: 'space-a',
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    });

    expect(payloads.map(({ setting }) => setting)).toEqual([
      'autonomy',
      'schedule_interval',
      'extras',
    ]);
    expect(payloads.every(({ bulk_write: bulkWrite }) => bulkWrite)).toBe(true);
    expect(
      payloads.every(
        ({ is_default_space: isDefaultSpace, settings_revision: revision }) =>
          !isDefaultSpace && revision === 5
      )
    ).toBe(true);
  });

  it('reports an extras change without any value', () => {
    const [payload, ...rest] = buildWorkerSettingsChangedPayloads({
      settings: {
        next: {
          ...RULE_TUNING_SETTINGS,
          extras: { ...RULE_TUNING_DEFAULT_EXTRAS, fpCountThreshold: 99 },
        },
        previous: RULE_TUNING_SETTINGS,
      },
      settingsRevision: 5,
      spaceId: 'default',
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    });

    expect(rest).toEqual([]);
    expect(payload).toEqual({
      bulk_write: false,
      is_default_space: true,
      setting: 'extras',
      settings_revision: 5,
      watch_tag: 'watch-detection',
      worker_id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    });
    expect(JSON.stringify(payload)).not.toContain('99');
  });

  it('reports a service account change as service_account, without the account', () => {
    const [payload, ...rest] = buildWorkerSettingsChangedPayloads({
      settings: {
        next: { ...RULE_TUNING_SETTINGS, serviceAccountId: 'kibana/az-worker-2' },
        previous: { ...RULE_TUNING_SETTINGS, serviceAccountId: 'kibana/az-worker-1' },
      },
      settingsRevision: 5,
      spaceId: 'default',
      workerId: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    });

    expect(rest).toEqual([]);
    expect(payload).toEqual({
      bulk_write: false,
      is_default_space: true,
      setting: 'service_account',
      settings_revision: 5,
      watch_tag: 'watch-detection',
      worker_id: SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
    });
    expect(JSON.stringify(payload)).not.toContain('az-worker');
  });

  it('omits settings_revision for a Worker saved for the first time', () => {
    const [payload] = buildWorkerSettingsChangedPayloads({
      settings: {
        next: {
          autonomy: 'assisted',
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        },
        previous: {
          autonomy: 'manual',
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
        },
      },
      settingsRevision: null,
      spaceId: 'default',
      workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    });

    expect(payload).not.toHaveProperty('settings_revision');
    expect(payload).toEqual(
      expect.objectContaining({ next_value: 'assisted', previous_value: 'manual' })
    );
  });

  it('ships the `other` catalog fields for a worker id outside the catalog', () => {
    const [payload] = buildWorkerSettingsChangedPayloads({
      settings: {
        next: { autonomy: 'assisted', workerId: 'custom-worker' },
        previous: { autonomy: 'manual', workerId: 'custom-worker' },
      },
      settingsRevision: 1,
      spaceId: 'default',
      workerId: 'custom-worker',
    });

    expect(payload).toEqual(expect.objectContaining({ watch_tag: 'other', worker_id: 'other' }));
  });

  describe('enabled', () => {
    it.each([
      [true, false, 'false', 'true'],
      [false, true, 'true', 'false'],
    ])(
      'reports next %p after previous %p as the keyword strings %p to %p',
      (next, previous, previousValue, nextValue) => {
        expect(
          buildWorkerSettingsChangedPayloads({
            enabled: { next, previous },
            settingsRevision: null,
            spaceId: 'default',
            workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          })
        ).toEqual([
          {
            bulk_write: false,
            is_default_space: true,
            next_value: nextValue,
            previous_value: previousValue,
            setting: 'enabled',
            watch_tag: 'watch-floor',
            worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
          },
        ]);
      }
    );

    it.each([[true], [false]])('returns no payload when enabled stays %p', (enabled) => {
      expect(
        buildWorkerSettingsChangedPayloads({
          enabled: { next: enabled, previous: enabled },
          settingsRevision: null,
          spaceId: 'default',
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        })
      ).toEqual([]);
    });

    it('returns no payload when the write carries neither settings nor an enabled change', () => {
      expect(
        buildWorkerSettingsChangedPayloads({
          settingsRevision: null,
          spaceId: 'default',
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        })
      ).toEqual([]);
    });

    it('marks a settings change and an enabled change of one write as a bulk write with one revision', () => {
      const payloads = buildWorkerSettingsChangedPayloads({
        enabled: { next: false, previous: true },
        settings: {
          next: { ...ATTACK_DISCOVERY_SETTINGS, autonomy: 'supervised' },
          previous: ATTACK_DISCOVERY_SETTINGS,
        },
        settingsRevision: 7,
        spaceId: 'space-a',
        workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
      });

      expect(payloads).toEqual([
        {
          bulk_write: true,
          is_default_space: false,
          next_value: 'supervised',
          previous_value: 'manual',
          setting: 'autonomy',
          settings_revision: 7,
          watch_tag: 'watch-floor',
          worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        },
        {
          bulk_write: true,
          is_default_space: false,
          next_value: 'false',
          previous_value: 'true',
          setting: 'enabled',
          settings_revision: 7,
          watch_tag: 'watch-floor',
          worker_id: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        },
      ]);
    });

    it('does not count an unchanged enabled state toward a bulk write', () => {
      expect(
        buildWorkerSettingsChangedPayloads({
          enabled: { next: true, previous: true },
          settings: {
            next: { ...ATTACK_DISCOVERY_SETTINGS, autonomy: 'supervised' },
            previous: ATTACK_DISCOVERY_SETTINGS,
          },
          settingsRevision: 7,
          spaceId: 'default',
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        })
      ).toEqual([expect.objectContaining({ bulk_write: false, setting: 'autonomy' })]);
    });

    it('reports an enabled change alone when the settings in the same write are unchanged', () => {
      expect(
        buildWorkerSettingsChangedPayloads({
          enabled: { next: true, previous: false },
          settings: { next: { ...ATTACK_DISCOVERY_SETTINGS }, previous: ATTACK_DISCOVERY_SETTINGS },
          settingsRevision: 7,
          spaceId: 'default',
          workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
        })
      ).toEqual([
        expect.objectContaining({ bulk_write: false, setting: 'enabled', settings_revision: 7 }),
      ]);
    });
  });
});
