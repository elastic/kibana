/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_DARK_ID, WatchAutonomyLevel } from '@kbn/pnd-common';
import type { DarkWatchTemplateValues } from '@kbn/workflows/managed';
import type { WatchSettingsRegistration } from './types';

const WATCH_SETTINGS_VERSION = 1;

const DEFAULT_SCOPES: DarkWatchTemplateValues['scopes'] = [
  { name: 'Mail · IdP', access: 'full', label: 'Read + monitor' },
  { name: 'Edge / VPN', access: 'full', label: 'Read + monitor' },
  { name: 'Customer data', access: 'denied', label: 'No access' },
];

const TIER2_WHEN: ReadonlyArray<DarkWatchTemplateValues['tier2When']> = ['on_hits', 'always'];
const TARGET_TECHNOLOGY: ReadonlyArray<DarkWatchTemplateValues['targetTechnology']> = [
  'aws_iam',
  'fortigate',
];

// Concurrent report branches cannot exceed the workflow engine's parallel
// concurrency ceiling, and one sweep cannot select more reports than the
// parallel fan-out cap.
const MAX_FAN_OUT_MAX = 20;
const MAX_CANDIDATE_LIMIT = 100;
const MAX_INTERVAL_MINUTES = 10080;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseScopes = (raw: unknown): DarkWatchTemplateValues['scopes'] => {
  if (!Array.isArray(raw)) {
    throw new Error(`PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain invalid scopes`);
  }
  return raw.map((item, index) => {
    if (!isRecord(item)) {
      throw new Error(
        `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain invalid scope at index ${index}`
      );
    }
    const { name, access, label } = item;
    if (
      typeof name !== 'string' ||
      typeof access !== 'string' ||
      typeof label !== 'string' ||
      name.length === 0 ||
      access.length === 0 ||
      label.length === 0
    ) {
      throw new Error(
        `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain invalid scope at index ${index}`
      );
    }
    return { name, access, label };
  });
};

const parsePositiveInt = (raw: unknown, field: string, max: number): number => {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > max) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid ${field}`
    );
  }
  return raw;
};

const parseNonNegativeInt = (raw: unknown, field: string, max: number): number => {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0 || raw > max) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid ${field}`
    );
  }
  return raw;
};

const parseDarkWatchValues = (raw: Record<string, unknown>): DarkWatchTemplateValues => {
  const {
    settingsVersion,
    autonomyLevel,
    scheduleId,
    allowManualRun,
    scopes,
    inferenceEndpointId,
    tier2When,
    candidateLimit,
    fanOutMax,
    scheduleEveryMinutes,
    targetTechnology,
    leadPollIntervalMinutes,
    leadMinPriority,
    intelEventTriggerEnabled,
  } = raw;

  if (settingsVersion !== undefined && settingsVersion !== WATCH_SETTINGS_VERSION) {
    throw new Error(
      `Unsupported settings version for PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}": ${String(
        settingsVersion
      )}`
    );
  }

  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid autonomy level`
    );
  }

  if (typeof scheduleId !== 'string' || scheduleId.length === 0 || scheduleId.length > 128) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid scheduleId`
    );
  }
  if (typeof allowManualRun !== 'boolean') {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid allowManualRun`
    );
  }
  if (typeof inferenceEndpointId !== 'string' || inferenceEndpointId.length > 256) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid inferenceEndpointId`
    );
  }
  const parsedTier2When = TIER2_WHEN.find((value) => value === tier2When);
  if (!parsedTier2When) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid tier2When`
    );
  }
  const parsedTargetTechnology = TARGET_TECHNOLOGY.find((value) => value === targetTechnology);
  if (!parsedTargetTechnology) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid targetTechnology`
    );
  }
  if (typeof intelEventTriggerEnabled !== 'boolean') {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid intelEventTriggerEnabled`
    );
  }

  return {
    settingsVersion: WATCH_SETTINGS_VERSION,
    autonomyLevel: parsedAutonomyLevel.data,
    scheduleId,
    allowManualRun,
    scopes: parseScopes(scopes),
    inferenceEndpointId,
    tier2When: parsedTier2When,
    candidateLimit: parsePositiveInt(candidateLimit, 'candidateLimit', MAX_CANDIDATE_LIMIT),
    fanOutMax: parsePositiveInt(fanOutMax, 'fanOutMax', MAX_FAN_OUT_MAX),
    scheduleEveryMinutes: parsePositiveInt(
      scheduleEveryMinutes,
      'scheduleEveryMinutes',
      MAX_INTERVAL_MINUTES
    ),
    targetTechnology: parsedTargetTechnology,
    leadPollIntervalMinutes: parsePositiveInt(
      leadPollIntervalMinutes,
      'leadPollIntervalMinutes',
      MAX_INTERVAL_MINUTES
    ),
    leadMinPriority: parseNonNegativeInt(leadMinPriority, 'leadMinPriority', 100),
    intelEventTriggerEnabled,
  };
};

const DEFAULT_DARK_WATCH_VALUES: DarkWatchTemplateValues = {
  settingsVersion: WATCH_SETTINGS_VERSION,
  autonomyLevel: 'supervised',
  scheduleId: 'dark-overnight-sweep',
  allowManualRun: true,
  scopes: DEFAULT_SCOPES,
  inferenceEndpointId: '',
  tier2When: 'on_hits',
  candidateLimit: 10,
  fanOutMax: 10,
  scheduleEveryMinutes: 240,
  targetTechnology: 'aws_iam',
  leadPollIntervalMinutes: 60,
  leadMinPriority: 7,
  intelEventTriggerEnabled: false,
};

const createDefaultDarkWatchValues = (): DarkWatchTemplateValues => ({
  ...DEFAULT_DARK_WATCH_VALUES,
  scopes: DEFAULT_SCOPES.map((scope) => ({ ...scope })),
});

export const createDarkWatchSettingsRegistration = (): WatchSettingsRegistration => ({
  createDefaultValues: createDefaultDarkWatchValues,
  // Dials added since a document was last installed fall back to their default
  // rather than failing the whole reconciliation pass. Any added or dropped key
  // is a migration, since settingsVersion alone cannot tell those documents
  // apart while the watch is still on its first version.
  migrate: (raw) => {
    const values = parseDarkWatchValues({ ...createDefaultDarkWatchValues(), ...raw });
    const storedKeys = Object.keys(raw);
    const expectedKeys = Object.keys(values);
    return {
      values,
      migrated:
        raw.settingsVersion !== WATCH_SETTINGS_VERSION ||
        storedKeys.length !== expectedKeys.length ||
        expectedKeys.some((key) => !(key in raw)),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseDarkWatchValues(raw);
    if (patch.scopeRouting) return { rejected: 'scope and routing settings' };
    if (patch.approvalGate) {
      return { rejected: `approval gate "${patch.approvalGate.gateId}"` };
    }
    if (patch.worker) return { rejected: `worker "${patch.worker.workerId}"` };
    if (patch.skill) return { rejected: `skill "${patch.skill.skillId}"` };

    const next: DarkWatchTemplateValues = {
      ...values,
      autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
      scheduleId: patch.triggers?.scheduleId ?? patch.dark?.scheduleId ?? values.scheduleId,
      allowManualRun:
        patch.triggers?.allowManualRun ?? patch.dark?.allowManualRun ?? values.allowManualRun,
      inferenceEndpointId: patch.dark?.inferenceEndpointId ?? values.inferenceEndpointId,
      tier2When: patch.dark?.tier2When ?? values.tier2When,
      candidateLimit: patch.dark?.candidateLimit ?? values.candidateLimit,
      fanOutMax: patch.dark?.fanOutMax ?? values.fanOutMax,
      scheduleEveryMinutes: patch.dark?.scheduleEveryMinutes ?? values.scheduleEveryMinutes,
      targetTechnology: patch.dark?.targetTechnology ?? values.targetTechnology,
      leadPollIntervalMinutes:
        patch.dark?.leadPollIntervalMinutes ?? values.leadPollIntervalMinutes,
      leadMinPriority: patch.dark?.leadMinPriority ?? values.leadMinPriority,
      intelEventTriggerEnabled:
        patch.dark?.intelEventTriggerEnabled ?? values.intelEventTriggerEnabled,
      scopes: patch.dark?.scopes ?? values.scopes,
    };

    return { values: parseDarkWatchValues(next) };
  },
  toSettings: (raw) => {
    const values = parseDarkWatchValues(raw);
    return {
      watchId: SYSTEM_SECURITY_WATCH_DARK_ID,
      autonomy: values.autonomyLevel,
      dark: {
        inferenceEndpointId: values.inferenceEndpointId,
        tier2When: values.tier2When,
        candidateLimit: values.candidateLimit,
        fanOutMax: values.fanOutMax,
        scheduleEveryMinutes: values.scheduleEveryMinutes,
        targetTechnology: values.targetTechnology,
        leadPollIntervalMinutes: values.leadPollIntervalMinutes,
        leadMinPriority: values.leadMinPriority,
        intelEventTriggerEnabled: values.intelEventTriggerEnabled,
        scheduleId: values.scheduleId,
        allowManualRun: values.allowManualRun,
        scopes: values.scopes,
      },
    };
  },
});
