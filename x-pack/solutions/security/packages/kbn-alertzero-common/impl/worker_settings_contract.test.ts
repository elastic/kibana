/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertWorkerSettingsContractConsistency,
  getAllowedAutonomyLevels,
  getCompleteWorkerSettingsSchema,
  getWorkerExtrasFields,
  parseCompleteWorkerSettings,
  rejectUnsupportedWorkerSettingsWrite,
  touchesWorkerSettings,
  workerOwnsSchedule,
} from './worker_settings_contract';

const RULE_TUNING = 'system-security-detection-rule-tuning';
const ALERT_TRIAGE = 'system-security-floor-alert-triage';
const ATTACK_DISCOVERY = 'system-security-floor-attack-discovery';
const THREAT_HUNT = 'system-security-dark-continuous-threat-hunt';

describe('worker settings contract', () => {
  /**
   * decisions-3 item 14: the complete schema is the single capability declaration. These tests
   * fail if a schema edit and a derived capability disagree, which is the drift the doc asks
   * us to make impossible rather than merely discouraged.
   */
  describe('capability derivation (item 14)', () => {
    it('holds the schema and derived capabilities consistent', () => {
      expect(() => assertWorkerSettingsContractConsistency()).not.toThrow();
    });

    it('derives schedule ownership from the schema, not a parallel list', () => {
      expect(workerOwnsSchedule(RULE_TUNING)).toBe(true);
      expect(workerOwnsSchedule(ATTACK_DISCOVERY)).toBe(true);
      expect(workerOwnsSchedule(ALERT_TRIAGE)).toBe(false);
      expect(workerOwnsSchedule(THREAT_HUNT)).toBe(false);
    });

    it('derives extras ownership from the schema', () => {
      expect(getWorkerExtrasFields(RULE_TUNING)).toEqual(['analysisWindowDays']);
      expect(getWorkerExtrasFields(ALERT_TRIAGE)).toEqual([]);
      expect(getWorkerExtrasFields(THREAT_HUNT)).toEqual([]);
    });

    it('resolves every known Worker to a complete schema', () => {
      for (const workerId of [RULE_TUNING, ALERT_TRIAGE, ATTACK_DISCOVERY, THREAT_HUNT]) {
        expect(getCompleteWorkerSettingsSchema(workerId)).toBeDefined();
      }
    });

    it('falls back to the shared-only schema for an unregistered Worker', () => {
      const schema = getCompleteWorkerSettingsSchema('system-security-not-a-worker');
      expect(
        schema.safeParse({ workerId: 'system-security-not-a-worker', autonomy: 'manual' }).success
      ).toBe(true);
      // A Worker with no declared capability owns neither schedule nor extras.
      expect(workerOwnsSchedule('system-security-not-a-worker')).toBe(false);
      expect(getWorkerExtrasFields('system-security-not-a-worker')).toEqual([]);
    });
  });

  describe('allowed autonomy levels (item 3)', () => {
    it('derives the allowed set from the complete schema', () => {
      for (const workerId of [RULE_TUNING, ALERT_TRIAGE, ATTACK_DISCOVERY, THREAT_HUNT]) {
        expect(getAllowedAutonomyLevels(workerId)).toEqual(['manual', 'assisted', 'supervised']);
      }
    });

    it('never returns an empty set for a registered Worker', () => {
      for (const workerId of [RULE_TUNING, ALERT_TRIAGE, ATTACK_DISCOVERY, THREAT_HUNT]) {
        expect(getAllowedAutonomyLevels(workerId).length).toBeGreaterThan(0);
      }
    });

    it('rejects a write naming a level outside the allowed set', () => {
      const rejection = rejectUnsupportedWorkerSettingsWrite(RULE_TUNING, {
        autonomy: 'autopilot',
      } as never);

      expect(rejection).toBeDefined();
      expect(rejection).toContain('autopilot');
    });

    it('accepts a write naming an allowed level', () => {
      expect(
        rejectUnsupportedWorkerSettingsWrite(RULE_TUNING, { autonomy: 'assisted' })
      ).toBeUndefined();
    });
  });

  describe('wrong-Worker write rejection (item 5)', () => {
    it('rejects a schedule interval for a Worker that owns no schedule, naming the field', () => {
      const rejection = rejectUnsupportedWorkerSettingsWrite(ALERT_TRIAGE, {
        scheduleInterval: '24h',
      });

      expect(rejection).toBe('a schedule interval');
    });

    it('rejects analysisWindowDays sent to a non-tuning Worker, naming the field', () => {
      const rejection = rejectUnsupportedWorkerSettingsWrite(ALERT_TRIAGE, {
        extras: { analysisWindowDays: 7 },
      });

      expect(rejection).toBe('an analysis window');
    });

    it('accepts analysisWindowDays for the Worker that declares it', () => {
      expect(
        rejectUnsupportedWorkerSettingsWrite(RULE_TUNING, { extras: { analysisWindowDays: 7 } })
      ).toBeUndefined();
    });

    it('rejects an extras key no Worker declares', () => {
      const rejection = rejectUnsupportedWorkerSettingsWrite(RULE_TUNING, {
        extras: { confidenceThreshold: 0.5 },
      } as never);

      expect(rejection).toBeDefined();
      expect(rejection).toContain('confidenceThreshold');
    });

    it('accepts an empty patch', () => {
      expect(rejectUnsupportedWorkerSettingsWrite(RULE_TUNING, {})).toBeUndefined();
    });
  });

  describe('complete settings parsing', () => {
    it('parses a complete Rule Tuning settings object', () => {
      const settings = {
        workerId: RULE_TUNING,
        autonomy: 'manual' as const,
        scheduleInterval: '24h',
        extras: { analysisWindowDays: 7 },
      };

      expect(parseCompleteWorkerSettings(settings)).toEqual(settings);
    });

    it('throws when a Rule Tuning settings object omits its extras', () => {
      expect(() =>
        parseCompleteWorkerSettings({
          workerId: RULE_TUNING,
          autonomy: 'manual',
          scheduleInterval: '24h',
        })
      ).toThrow();
    });
  });

  describe('settings-touching detection (item 15)', () => {
    it('treats any settings object as a settings write', () => {
      expect(touchesWorkerSettings({ settings: { autonomy: 'manual' } })).toBe(true);
      expect(touchesWorkerSettings({ settings: { extras: { analysisWindowDays: 7 } } })).toBe(true);
    });

    it('treats a patch without settings as not touching settings', () => {
      expect(touchesWorkerSettings({})).toBe(false);
    });
  });
});
