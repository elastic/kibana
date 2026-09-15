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
  workerOwnsSchedule,
  getAllowedAutonomyLevels,
  getWorkerExtrasFields,
  type WorkerSettings,
  type WorkerSettingsWrite,
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
 * Default interval per schedule-driven Worker. VALUES only — capability (which
 * Workers own a schedule) is declared by the per-Worker complete schema via
 * workerOwnsSchedule, not by this map.
 */
const WORKER_SCHEDULE_DEFAULTS: Partial<Record<RegisteredWorkerId, string>> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: '24h',
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: '2h',
};

/**
 * Default analysis window for the Worker whose extras own it. VALUES only —
 * capability is declared by getWorkerExtrasFields.
 */
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

/**
 * Validates raw template values against the schema-derived capability set.
 * Fields a Worker does not own are dropped (matching the pre-existing behavior
 * for an unscheduled Worker's stray interval); out-of-range values throw so a
 * corrupted persisted document surfaces loudly.
 */
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
  // An absent autonomy level means "not yet chosen", not "corrupt": defaults
  // materialise from {} on first read. A PRESENT but unparseable value is still a
  // hard error so a corrupted persisted document surfaces loudly.
  const allowedLevels = getAllowedAutonomyLevels(workerId);
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(
    autonomyLevel === undefined ? allowedLevels[0] ?? 'manual' : autonomyLevel
  );
  if (!parsedAutonomyLevel.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid autonomy level`);
  }
  if (!allowedLevels.includes(parsedAutonomyLevel.data)) {
    throw new Error(
      `AlertZero worker "${workerId}" does not allow autonomy level "${parsedAutonomyLevel.data}"`
    );
  }

  const scheduleDefault = workerOwnsSchedule(workerId)
    ? WORKER_SCHEDULE_DEFAULTS[workerId] ?? '24h'
    : undefined;
  const ownsAnalysisWindow = getWorkerExtrasFields(workerId).includes('analysisWindowDays');
  const parsedAnalysisWindow =
    ownsAnalysisWindow && WORKER_ANALYSIS_WINDOW_DEFAULTS[workerId] !== undefined
      ? AnalysisWindowDays.safeParse(
          analysisWindowDays === undefined
            ? WORKER_ANALYSIS_WINDOW_DEFAULTS[workerId]
            : analysisWindowDays
        )
      : undefined;
  if (parsedAnalysisWindow && !parsedAnalysisWindow.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid analysis window`);
  }

  return {
    settingsVersion: currentVersion,
    autonomyLevel: parsedAutonomyLevel.data,
    ...(scheduleDefault === undefined
      ? {}
      : {
          scheduleInterval:
            typeof scheduleInterval === 'string' ? scheduleInterval : scheduleDefault,
        }),
    ...(parsedAnalysisWindow === undefined
      ? {}
      : { analysisWindowDays: parsedAnalysisWindow.data }),
  };
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => ({
  createDefaultValues: (): WorkerTemplateValues => parseWorkerValues(workerId, {}),
  migrate: (raw: Record<string, unknown>) => {
    const values = parseWorkerValues(workerId, raw);
    return {
      values,
      migrated:
        raw.settingsVersion !== WORKER_SETTINGS_VERSIONS[workerId] ||
        Object.keys(raw).some((key) => !Object.hasOwn(values, key)),
    };
  },
  applyPatch: (raw, patch: WorkerSettingsWrite) => {
    const values = parseWorkerValues(workerId, raw);
    const rejected = rejectUnsupportedWorkerSettingsWrite(workerId, patch);
    if (rejected) {
      return { rejected };
    }
    // The route schema constrains autonomy to the global enum, but each Worker's allowed set is
    // a subset of it (schema-derived). Validate the patch against the Worker's own allowed
    // levels so a narrowed schema rejects at the service layer too, not only in the UI.
    if (
      patch.autonomy !== undefined &&
      !getAllowedAutonomyLevels(workerId).includes(patch.autonomy)
    ) {
      return { rejected: 'an autonomy level' };
    }
    // extras replaces the whole stored object (worker-settings-page-decisions-3,
    // item 12): a partial extras patch is not merged field-by-field.
    const nextExtras =
      patch.extras == null ? {} : Object.keys(patch.extras).length === 0 ? {} : { ...patch.extras };
    const nextAnalysisWindow =
      nextExtras.analysisWindowDays === undefined
        ? readAnalysisWindowDays(values)
        : nextExtras.analysisWindowDays;
    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomy ?? values.autonomyLevel,
        ...(patch.scheduleInterval == null ? {} : { scheduleInterval: patch.scheduleInterval }),
        ...(nextAnalysisWindow === undefined ? {} : { analysisWindowDays: nextAnalysisWindow }),
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
      ...(scheduleInterval === undefined ? {} : { scheduleInterval }),
      ...(analysisWindowDays === undefined ? {} : { extras: { analysisWindowDays } }),
    });
  },
});
