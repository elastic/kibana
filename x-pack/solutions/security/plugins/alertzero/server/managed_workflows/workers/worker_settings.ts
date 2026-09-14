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
} from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValuesForId } from '@kbn/workflows/managed';
import type { WorkerSettingsRegistration } from './types';

type RegisteredWorkerId =
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
  | typeof SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID;
type WorkerTemplateValues = ManagedWorkflowTemplateValuesForId<RegisteredWorkerId>;

type AutonomyLevel = (typeof WATCH_AUTONOMY_LEVELS)[number];

interface WorkerSettingsProfile {
  settingsVersion: number;
  autonomy: {
    allowed: readonly AutonomyLevel[];
    default: AutonomyLevel;
  };
  /** Presence opts the Worker into a scheduled trigger. */
  schedule?: {
    defaultInterval: string;
  };
  /** Presence opts the Worker into the AD-only candidate-limit extras setting. */
  candidateLimit?: {
    default: number;
  };
}

const ALL_AUTONOMY_LEVELS = WATCH_AUTONOMY_LEVELS;

/**
 * Per-Worker settings profile. Opt-in is presence of a key — schedule and candidateLimit are
 * absent unless that Worker owns them. Autonomy is always present; `allowed` is the subset of
 * the shared scale this Worker offers (same meaning, different availability).
 */
const WORKER_SETTINGS_PROFILES: Record<RegisteredWorkerId, WorkerSettingsProfile> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
  },
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ['manual', 'supervised'], default: 'manual' },
    schedule: { defaultInterval: '24h' },
    candidateLimit: { default: 100 },
  },
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
    schedule: { defaultInterval: '2h' },
  },
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: {
    settingsVersion: 1,
    autonomy: { allowed: ALL_AUTONOMY_LEVELS, default: 'manual' },
  },
};

const isAllowedAutonomy = (level: AutonomyLevel, allowed: readonly AutonomyLevel[]): boolean =>
  allowed.includes(level);

/**
 * Reads the interval back off parsed template values. Needed because the values type is a union
 * over every Worker, so only the schedule-driven members type the field as a string.
 */
const readScheduleInterval = (values: WorkerTemplateValues): string | undefined =>
  typeof values.scheduleInterval === 'string' ? values.scheduleInterval : undefined;

const readCandidateLimit = (values: WorkerTemplateValues): number | undefined =>
  typeof values.candidateLimit === 'number' ? values.candidateLimit : undefined;

const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): { values: WorkerTemplateValues; autonomyClamped: boolean } => {
  const profile = WORKER_SETTINGS_PROFILES[workerId];
  const { settingsVersion, autonomyLevel, scheduleInterval, candidateLimit } = raw;
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
    ...(profile.schedule === undefined
      ? {}
      : { scheduleInterval: scheduleInterval ?? profile.schedule.defaultInterval }),
    ...(profile.candidateLimit === undefined
      ? {}
      : {
          candidateLimit:
            typeof candidateLimit === 'number' ? candidateLimit : profile.candidateLimit.default,
        }),
  };

  return { values, autonomyClamped };
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => {
  const profile = WORKER_SETTINGS_PROFILES[workerId];

  return {
    createDefaultValues: (): WorkerTemplateValues => ({
      settingsVersion: profile.settingsVersion,
      autonomyLevel: profile.autonomy.default,
      ...(profile.schedule === undefined
        ? {}
        : { scheduleInterval: profile.schedule.defaultInterval }),
      ...(profile.candidateLimit === undefined
        ? {}
        : { candidateLimit: profile.candidateLimit.default }),
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
      if (patch.scheduleInterval != null && profile.schedule === undefined) {
        return { rejected: 'a schedule interval' };
      }
      if (patch.candidateLimit != null && profile.candidateLimit === undefined) {
        return { rejected: 'a candidate limit' };
      }
      if (
        patch.autonomyLevel != null &&
        !isAllowedAutonomy(patch.autonomyLevel, profile.autonomy.allowed)
      ) {
        return { rejected: 'an autonomy level this Worker does not offer' };
      }
      return {
        values: {
          ...values,
          autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
          ...(patch.scheduleInterval == null ? {} : { scheduleInterval: patch.scheduleInterval }),
          ...(patch.candidateLimit == null ? {} : { candidateLimit: patch.candidateLimit }),
        },
      };
    },
    toSettings: (raw): WorkerSettings => {
      const { values } = parseWorkerValues(workerId, raw);
      const scheduleInterval = readScheduleInterval(values);
      const candidateLimit = readCandidateLimit(values);
      return {
        workerId,
        autonomy: values.autonomyLevel,
        allowedAutonomyLevels: [...profile.autonomy.allowed],
        // Spread rather than assign undefined: the registry test asserts the projection's keys
        // survive WorkerSettings.parse unchanged.
        ...(scheduleInterval === undefined ? {} : { scheduleInterval }),
        ...(candidateLimit === undefined ? {} : { candidateLimit }),
      };
    },
  };
};
