/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WATCH_AUTONOMY_LEVELS,
  WatchAutonomyLevel,
  type WorkerSettings,
  type WorkerSettingsExtras,
} from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValuesForId } from '@kbn/workflows/managed';
import { isPlainObject, workerExtrasById } from './extras';
import type { WorkerSettingsRegistration } from './types';

type RegisteredWorkerId =
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
  | typeof SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID;
type WorkerTemplateValues = ManagedWorkflowTemplateValuesForId<RegisteredWorkerId>;

type AutonomyLevel = (typeof WATCH_AUTONOMY_LEVELS)[number];

interface WorkerTriggers {
  /** On-demand / manual runs. Independent of whether a schedule is also allowed. */
  manual?: boolean;
  /** Presence means a scheduled trigger is allowed and the interval is a user setting. */
  scheduled?: {
    defaultInterval: string;
  };
}

interface WorkerSettingsProfile {
  settingsVersion: number;
  autonomy: {
    allowed: readonly AutonomyLevel[];
    default: AutonomyLevel;
  };
  triggers: WorkerTriggers;
}

const ALL_AUTONOMY_LEVELS = WATCH_AUTONOMY_LEVELS;

/**
 * Per-Worker settings profile for shared capabilities only. Unique settings live in
 * `workerExtrasById` — presence there is the extras opt-in.
 */
const WORKER_SETTINGS_PROFILES: Record<RegisteredWorkerId, WorkerSettingsProfile> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
    triggers: { manual: true },
  },
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ['manual', 'supervised'], default: 'manual' },
    triggers: { scheduled: { defaultInterval: '24h' } },
  },
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
    triggers: { manual: true },
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
    triggers: { manual: true, scheduled: { defaultInterval: '2h' } },
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
    triggers: { manual: true },
  },
};

const isAllowedAutonomy = (level: AutonomyLevel, allowed: readonly AutonomyLevel[]): boolean =>
  allowed.includes(level);

const allowedTriggersFrom = (triggers: WorkerTriggers): Array<'manual' | 'scheduled'> => [
  ...(triggers.manual ? (['manual'] as const) : []),
  ...(triggers.scheduled ? (['scheduled'] as const) : []),
];

/**
 * Reads the interval back off parsed template values. Needed because the values type is a union
 * over every Worker, so only the schedule-driven members type the field as a string.
 */
const readScheduleInterval = (values: WorkerTemplateValues): string | undefined =>
  typeof values.scheduleInterval === 'string' ? values.scheduleInterval : undefined;

const readExtras = (values: WorkerTemplateValues): Record<string, unknown> | undefined =>
  isPlainObject(values.extras) ? values.extras : undefined;

const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): { values: WorkerTemplateValues; autonomyClamped: boolean } => {
  const profile = WORKER_SETTINGS_PROFILES[workerId];
  const extrasModule = workerExtrasById[workerId];
  const { settingsVersion, autonomyLevel, scheduleInterval } = raw;
  if (settingsVersion !== undefined && settingsVersion !== profile.settingsVersion) {
    throw new Error(
      `Unsupported settings version for AlertZero worker "${workerId}": ${String(settingsVersion)}`
    );
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid autonomy level`);
  }

  const autonomyClamped = !isAllowedAutonomy(parsedAutonomyLevel.data, profile.autonomy.allowed);
  const resolvedAutonomy = autonomyClamped ? profile.autonomy.default : parsedAutonomyLevel.data;

  const values: WorkerTemplateValues = {
    settingsVersion: profile.settingsVersion,
    autonomyLevel: resolvedAutonomy,
    ...(profile.triggers.scheduled === undefined
      ? {}
      : {
          scheduleInterval: scheduleInterval ?? profile.triggers.scheduled.defaultInterval,
        }),
    ...(extrasModule === undefined ? {} : { extras: extrasModule.parse(raw.extras) }),
  };

  return { values, autonomyClamped };
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => {
  const profile = WORKER_SETTINGS_PROFILES[workerId];
  const extrasModule = workerExtrasById[workerId];

  return {
    createDefaultValues: (): WorkerTemplateValues => ({
      settingsVersion: profile.settingsVersion,
      autonomyLevel: profile.autonomy.default,
      ...(profile.triggers.scheduled === undefined
        ? {}
        : { scheduleInterval: profile.triggers.scheduled.defaultInterval }),
      ...(extrasModule === undefined ? {} : { extras: extrasModule.createDefaults() }),
    }),
    migrate: (raw: Record<string, unknown>) => {
      const { values, autonomyClamped } = parseWorkerValues(workerId, raw);
      return {
        values,
        migrated:
          autonomyClamped ||
          raw.settingsVersion !== profile.settingsVersion ||
          Object.keys(raw).some((key) => !Object.hasOwn(values, key)),
      };
    },
    applyPatch: (raw, patch) => {
      const { values } = parseWorkerValues(workerId, raw);
      if (patch.scheduleInterval != null && profile.triggers.scheduled === undefined) {
        return { rejected: 'a schedule interval' };
      }
      if (patch.extras != null && extrasModule === undefined) {
        return { rejected: 'worker-specific extras' };
      }
      if (
        patch.autonomyLevel != null &&
        !isAllowedAutonomy(patch.autonomyLevel, profile.autonomy.allowed)
      ) {
        return { rejected: 'an autonomy level this Worker does not offer' };
      }

      let extras = readExtras(values);
      if (patch.extras != null && extrasModule !== undefined) {
        const applied = extrasModule.applyPatch(
          extras ?? extrasModule.createDefaults(),
          patch.extras
        );
        if ('rejected' in applied) {
          return applied;
        }
        extras = applied.extras;
      }

      return {
        values: {
          ...values,
          autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
          ...(patch.scheduleInterval == null ? {} : { scheduleInterval: patch.scheduleInterval }),
          ...(extras === undefined ? {} : { extras }),
        },
      };
    },
    toSettings: (raw): WorkerSettings => {
      const { values } = parseWorkerValues(workerId, raw);
      const scheduleInterval = readScheduleInterval(values);
      const extras = readExtras(values);
      return {
        workerId,
        autonomy: values.autonomyLevel,
        allowedAutonomyLevels: [...profile.autonomy.allowed],
        allowedTriggers: allowedTriggersFrom(profile.triggers),
        // Spread rather than assign undefined: the registry test asserts the projection's keys
        // survive WorkerSettings.parse unchanged.
        ...(scheduleInterval === undefined ? {} : { scheduleInterval }),
        ...(extras === undefined ? {} : { extras: extras as WorkerSettingsExtras }),
      };
    },
  };
};
