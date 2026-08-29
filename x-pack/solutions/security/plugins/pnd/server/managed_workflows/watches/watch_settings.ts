/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  WatchAutonomyLevel,
} from '@kbn/pnd-common';
import type { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';
import type { ManagedWorkflowTemplateValuesForId } from '@kbn/workflows/managed';
import type { WatchSettingsRegistration } from './types';

type RegisteredWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];
type WatchTemplateValues = ManagedWorkflowTemplateValuesForId<RegisteredWatchId>;

const WATCH_SETTINGS_VERSIONS: Record<RegisteredWatchId, number> = {
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: 1,
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: 1,
  [SYSTEM_SECURITY_WATCH_DARK_ID]: 1,
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: 1,
  [SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID]: 1,
  [SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID]: 1,
};

const parseWatchValues = (watchId: RegisteredWatchId, raw: Record<string, unknown>) => {
  const currentVersion = WATCH_SETTINGS_VERSIONS[watchId];
  const { settingsVersion, autonomyLevel } = raw;
  if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
    throw new Error(
      `Unsupported settings version for PND watch "${watchId}": ${String(settingsVersion)}`
    );
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(`PND watch "${watchId}" settings contain an invalid autonomy level`);
  }
  return {
    settingsVersion: currentVersion,
    autonomyLevel: parsedAutonomyLevel.data,
  } satisfies WatchTemplateValues;
};

export const createWatchSettingsRegistration = (
  watchId: RegisteredWatchId
): WatchSettingsRegistration => ({
  createDefaultValues: (): WatchTemplateValues => ({
    settingsVersion: WATCH_SETTINGS_VERSIONS[watchId],
    autonomyLevel: 'manual',
  }),
  migrate: (raw: Record<string, unknown>) => {
    const values = parseWatchValues(watchId, raw);
    return {
      values,
      migrated:
        raw.settingsVersion !== WATCH_SETTINGS_VERSIONS[watchId] ||
        Object.keys(raw).some((key) => !Object.hasOwn(values, key)),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseWatchValues(watchId, raw);
    if (patch.triggers) return { rejected: 'trigger settings' };
    if (patch.generation) return { rejected: 'generation settings' };
    if (patch.scopeRouting) return { rejected: 'scope and routing settings' };
    if (patch.approvalGate) {
      return { rejected: `approval gate "${patch.approvalGate.gateId}"` };
    }
    if (patch.worker) return { rejected: `worker "${patch.worker.workerId}"` };
    if (patch.skill) return { rejected: `skill "${patch.skill.skillId}"` };

    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
      },
    };
  },
  toSettings: (raw) => {
    const values = parseWatchValues(watchId, raw);
    return {
      watchId,
      autonomy: values.autonomyLevel,
    };
  },
});

type AdGenerationTemplateValues = ManagedWorkflowTemplateValuesForId<
  typeof SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID
>;

/**
 * Schedule select option ids (the UI vocabulary) mapped to workflows `scheduled`
 * trigger intervals (the YAML vocabulary). The keys are what
 * `SCHEDULE_OPTION_LABELS` renders and what PATCH `triggers.scheduleId` carries.
 */
const AD_GENERATION_SCHEDULE_OPTIONS: Record<string, string> = {
  'every-5m': '5m',
  'every-15m': '15m',
  'every-30m': '30m',
  hourly: '1h',
};

const AD_GENERATION_SCHEDULE_OPTION_IDS = Object.keys(AD_GENERATION_SCHEDULE_OPTIONS);

const scheduleOptionIdForEvery = (every: string): string =>
  AD_GENERATION_SCHEDULE_OPTION_IDS.find(
    (optionId) => AD_GENERATION_SCHEDULE_OPTIONS[optionId] === every
  ) ?? 'every-15m';

const AD_GENERATION_DEFAULTS = {
  alertSize: 100,
  connectorId: '',
  lookback: 'now-24h',
  scheduleEvery: '15m',
} as const;

const parseAdGenerationValues = (raw: Record<string, unknown>): AdGenerationTemplateValues => {
  const watchId = SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID;
  const currentVersion = WATCH_SETTINGS_VERSIONS[watchId];
  const { settingsVersion, autonomyLevel, scheduleEvery, alertSize, lookback, connectorId } = raw;
  if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
    throw new Error(
      `Unsupported settings version for PND watch "${watchId}": ${String(settingsVersion)}`
    );
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(`PND watch "${watchId}" settings contain an invalid autonomy level`);
  }
  return {
    settingsVersion: currentVersion,
    autonomyLevel: parsedAutonomyLevel.data,
    scheduleEvery:
      typeof scheduleEvery === 'string' &&
      Object.values(AD_GENERATION_SCHEDULE_OPTIONS).includes(scheduleEvery)
        ? scheduleEvery
        : AD_GENERATION_DEFAULTS.scheduleEvery,
    alertSize:
      typeof alertSize === 'number' &&
      Number.isInteger(alertSize) &&
      alertSize >= 1 &&
      alertSize <= 500
        ? alertSize
        : AD_GENERATION_DEFAULTS.alertSize,
    lookback:
      typeof lookback === 'string' && lookback.length >= 1 && lookback.length <= 64
        ? lookback
        : AD_GENERATION_DEFAULTS.lookback,
    connectorId:
      typeof connectorId === 'string' && connectorId.length <= 256
        ? connectorId
        : AD_GENERATION_DEFAULTS.connectorId,
  } satisfies AdGenerationTemplateValues;
};

/**
 * Settings for the Attack Discovery Generation watch. Unlike the shared watch
 * registration it accepts `triggers.scheduleId` (the schedule select) and the
 * `generation` options — those are exactly the template values its YAML renders,
 * so a write here is what changes the worker's cadence and generation inputs.
 */
export const createAdGenerationWatchSettingsRegistration = (): WatchSettingsRegistration => ({
  createDefaultValues: (): AdGenerationTemplateValues => ({
    settingsVersion: WATCH_SETTINGS_VERSIONS[SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID],
    autonomyLevel: 'manual',
    ...AD_GENERATION_DEFAULTS,
  }),
  migrate: (raw: Record<string, unknown>) => {
    const values = parseAdGenerationValues(raw);
    return {
      values,
      migrated:
        raw.settingsVersion !==
          WATCH_SETTINGS_VERSIONS[SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID] ||
        Object.keys(raw).some((key) => !Object.hasOwn(values, key)),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseAdGenerationValues(raw);
    if (patch.scopeRouting) return { rejected: 'scope and routing settings' };
    if (patch.approvalGate) {
      return { rejected: `approval gate "${patch.approvalGate.gateId}"` };
    }
    if (patch.worker) return { rejected: `worker "${patch.worker.workerId}"` };
    if (patch.skill) return { rejected: `skill "${patch.skill.skillId}"` };

    let scheduleEvery = values.scheduleEvery;
    if (patch.triggers?.scheduleId !== undefined) {
      const every = AD_GENERATION_SCHEDULE_OPTIONS[patch.triggers.scheduleId];
      if (!every) return { rejected: `schedule "${patch.triggers.scheduleId}"` };
      scheduleEvery = every;
    }

    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
        scheduleEvery,
        alertSize: patch.generation?.alertSize ?? values.alertSize,
        lookback: patch.generation?.lookback ?? values.lookback,
        connectorId: patch.generation?.connectorId ?? values.connectorId,
      },
    };
  },
  toSettings: (raw) => {
    const values = parseAdGenerationValues(raw);
    return {
      watchId: SYSTEM_SECURITY_WATCH_ATTACK_DISCOVERY_GENERATION_ID,
      autonomy: values.autonomyLevel,
      triggers: {
        sharedWithAttackDiscovery: false,
        schedule: {
          optionIds: AD_GENERATION_SCHEDULE_OPTION_IDS,
          selectedId: scheduleOptionIdForEvery(values.scheduleEvery),
        },
        allowManualRun: true,
      },
      generation: {
        alertSize: values.alertSize,
        lookback: values.lookback,
        connectorId: values.connectorId,
      },
    };
  },
});
