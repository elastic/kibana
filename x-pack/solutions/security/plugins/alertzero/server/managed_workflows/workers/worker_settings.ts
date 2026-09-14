/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ANALYSIS_WINDOW_DAYS_DEFAULT,
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WatchAutonomyLevel,
  AnalysisWindowDays,
  parseCompleteWorkerSettings,
  rejectUnsupportedWorkerSettingsWrite,
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

const WORKER_SETTINGS_VERSIONS: Record<RegisteredWorkerId, number> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 1,
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: 1,
};

/**
 * Default interval per schedule-driven Worker. Presence in this map is what opts a Worker into the
 * schedule setting — the other Workers are alert- or event-triggered and own no schedule, so the
 * setting is absent from their template values and from their projected settings entirely.
 */
const WORKER_SCHEDULE_DEFAULTS: Partial<Record<RegisteredWorkerId, string>> = {
  // Matches the Attack Discovery schedule form default.
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: '24h',
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: '2h',
};

const WORKER_ANALYSIS_WINDOW_DEFAULTS: Partial<Record<RegisteredWorkerId, number>> = {
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: ANALYSIS_WINDOW_DAYS_DEFAULT,
};

/**
 * Reads the interval back off parsed template values. Needed because the values type is a union
 * over every Worker, so only the schedule-driven members type the field as a string.
 */
const readScheduleInterval = (values: WorkerTemplateValues): string | undefined =>
  typeof values.scheduleInterval === 'string' ? values.scheduleInterval : undefined;

const readAnalysisWindowDays = (values: WorkerTemplateValues): number | undefined =>
  'analysisWindowDays' in values && typeof values.analysisWindowDays === 'number'
    ? values.analysisWindowDays
    : undefined;

const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): WorkerTemplateValues => {
  const currentVersion = WORKER_SETTINGS_VERSIONS[workerId];
  const { settingsVersion, autonomyLevel, scheduleInterval, analysisWindowDays } = raw;
  if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
    throw new Error(
      `Unsupported settings version for AlertZero worker "${workerId}": ${String(settingsVersion)}`
    );
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid autonomy level`);
  }

  const scheduleDefault = WORKER_SCHEDULE_DEFAULTS[workerId];
  const analysisWindowDefault = WORKER_ANALYSIS_WINDOW_DEFAULTS[workerId];
  const parsedAnalysisWindow =
    analysisWindowDefault === undefined
      ? undefined
      : AnalysisWindowDays.safeParse(
          analysisWindowDays === undefined ? analysisWindowDefault : analysisWindowDays
        );
  if (parsedAnalysisWindow && !parsedAnalysisWindow.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid analysis window`);
  }

  return {
    settingsVersion: currentVersion,
    autonomyLevel: parsedAutonomyLevel.data,
    ...(scheduleDefault === undefined
      ? {}
      : { scheduleInterval: scheduleInterval ?? scheduleDefault }),
    ...(parsedAnalysisWindow === undefined
      ? {}
      : { analysisWindowDays: parsedAnalysisWindow.data }),
  };
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => ({
  createDefaultValues: (): WorkerTemplateValues => {
    const scheduleDefault = WORKER_SCHEDULE_DEFAULTS[workerId];
    const analysisWindowDefault = WORKER_ANALYSIS_WINDOW_DEFAULTS[workerId];
    return {
      settingsVersion: WORKER_SETTINGS_VERSIONS[workerId],
      autonomyLevel: 'manual',
      ...(scheduleDefault === undefined ? {} : { scheduleInterval: scheduleDefault }),
      ...(analysisWindowDefault === undefined ? {} : { analysisWindowDays: analysisWindowDefault }),
    };
  },
  migrate: (raw: Record<string, unknown>) => {
    const values = parseWorkerValues(workerId, raw);
    return {
      values,
      migrated:
        raw.settingsVersion !== WORKER_SETTINGS_VERSIONS[workerId] ||
        Object.keys(raw).some((key) => !Object.hasOwn(values, key)),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseWorkerValues(workerId, raw);
    const rejected = rejectUnsupportedWorkerSettingsWrite(workerId, patch);
    if (rejected) {
      return { rejected };
    }
    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomy ?? values.autonomyLevel,
        ...(patch.scheduleInterval == null ? {} : { scheduleInterval: patch.scheduleInterval }),
        ...(patch.analysisWindowDays == null
          ? {}
          : { analysisWindowDays: patch.analysisWindowDays }),
      },
    };
  },
  toSettings: (raw): WorkerSettings => {
    const values = parseWorkerValues(workerId, raw);
    const scheduleInterval = readScheduleInterval(values);
    const analysisWindowDays = readAnalysisWindowDays(values);
    return parseCompleteWorkerSettings({
      workerId,
      autonomy: values.autonomyLevel,
      // Spread rather than assign undefined: the registry test asserts the projection's keys
      // survive WorkerSettings.parse unchanged.
      ...(scheduleInterval === undefined ? {} : { scheduleInterval }),
      ...(analysisWindowDays === undefined ? {} : { analysisWindowDays }),
    });
  },
});
