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

const TIER2_WHEN = new Set(['on_hits', 'always']);
const TARGET_TECHNOLOGY = new Set(['aws_iam', 'fortigate']);

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
    connectorId,
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
  if (typeof connectorId !== 'string' || connectorId.length > 256) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid connectorId`
    );
  }
  if (typeof tier2When !== 'string' || !TIER2_WHEN.has(tier2When)) {
    throw new Error(
      `PND watch "${SYSTEM_SECURITY_WATCH_DARK_ID}" settings contain an invalid tier2When`
    );
  }
  if (typeof targetTechnology !== 'string' || !TARGET_TECHNOLOGY.has(targetTechnology)) {
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
    connectorId,
    tier2When: tier2When as DarkWatchTemplateValues['tier2When'],
    candidateLimit: parsePositiveInt(candidateLimit, 'candidateLimit', 100),
    fanOutMax: parsePositiveInt(fanOutMax, 'fanOutMax', 100),
    scheduleEveryMinutes: parsePositiveInt(scheduleEveryMinutes, 'scheduleEveryMinutes', 10080),
    targetTechnology: targetTechnology as DarkWatchTemplateValues['targetTechnology'],
    leadPollIntervalMinutes: parsePositiveInt(
      leadPollIntervalMinutes,
      'leadPollIntervalMinutes',
      10080
    ),
    leadMinPriority: parseNonNegativeInt(leadMinPriority, 'leadMinPriority', 100),
    intelEventTriggerEnabled,
  };
};

const darkValuesKeys: Array<keyof DarkWatchTemplateValues> = [
  'settingsVersion',
  'autonomyLevel',
  'scheduleId',
  'allowManualRun',
  'scopes',
  'connectorId',
  'tier2When',
  'candidateLimit',
  'fanOutMax',
  'scheduleEveryMinutes',
  'targetTechnology',
  'leadPollIntervalMinutes',
  'leadMinPriority',
  'intelEventTriggerEnabled',
];

const DEFAULT_DARK_WATCH_VALUES: DarkWatchTemplateValues = {
  settingsVersion: WATCH_SETTINGS_VERSION,
  autonomyLevel: 'supervised',
  scheduleId: 'dark-overnight-sweep',
  allowManualRun: true,
  scopes: DEFAULT_SCOPES,
  connectorId: '',
  tier2When: 'on_hits',
  candidateLimit: 10,
  fanOutMax: 10,
  scheduleEveryMinutes: 240,
  targetTechnology: 'aws_iam',
  leadPollIntervalMinutes: 60,
  leadMinPriority: 7,
  intelEventTriggerEnabled: false,
};

export const createDarkWatchSettingsRegistration = (): WatchSettingsRegistration => ({
  createDefaultValues: (): DarkWatchTemplateValues => ({
    ...DEFAULT_DARK_WATCH_VALUES,
    scopes: DEFAULT_SCOPES.map((scope) => ({ ...scope })),
  }),
  migrate: (raw: Record<string, unknown>) => {
    const values = parseDarkWatchValues({
      ...DEFAULT_DARK_WATCH_VALUES,
      ...raw,
    });
    return {
      values,
      migrated:
        raw.settingsVersion !== WATCH_SETTINGS_VERSION ||
        Object.keys(raw).some(
          (key) => !darkValuesKeys.includes(key as keyof DarkWatchTemplateValues)
        ),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseDarkWatchValues(raw as Record<string, unknown>);
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
      connectorId: patch.dark?.connectorId ?? values.connectorId,
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
    const values = parseDarkWatchValues(raw as Record<string, unknown>);
    return {
      watchId: SYSTEM_SECURITY_WATCH_DARK_ID,
      autonomy: values.autonomyLevel,
      dark: {
        connectorId: values.connectorId,
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
