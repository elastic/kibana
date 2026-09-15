/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DetectionConfig,
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

type DetectionConfigValues = NonNullable<WorkerSettings['detectionConfig']>;

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
 * Default detection tuning values per Worker whose autonomy cards reference them. Presence in this
 * map is what opts a Worker into the detectionConfig setting — every other Worker's settings never
 * carry a detectionConfig, regardless of what raw storage or a patch contains. Values match the Sep
 * 11 prototype's fallbacks (WorkerSettingsForm.tsx).
 */
const WORKER_DETECTION_CONFIG_DEFAULTS: Partial<
  Record<RegisteredWorkerId, Required<DetectionConfigValues>>
> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: {
    confidenceThreshold: 0.85,
    fpCountThreshold: 10,
  },
};

/**
 * Reads the interval back off parsed template values. Needed because the values type is a union
 * over every Worker, so only the schedule-driven members type the field as a string.
 */
const readScheduleInterval = (values: WorkerTemplateValues): string | undefined =>
  typeof values.scheduleInterval === 'string' ? values.scheduleInterval : undefined;

/**
 * Reads detectionConfig back off parsed template values. Needed for the same reason as
 * readScheduleInterval — only the opted-in Worker's values type the field.
 */
const readDetectionConfig = (values: WorkerTemplateValues): DetectionConfigValues | undefined => {
  const { detectionConfig } = values;
  return detectionConfig != null && typeof detectionConfig === 'object'
    ? (detectionConfig as DetectionConfigValues)
    : undefined;
};

/**
 * Validates and defaults a raw detectionConfig. Returns undefined when the Worker owns no
 * detectionConfig at all (raw is dropped in that case, matching the schedule setting's handling of
 * an unscheduled Worker). Throws on an out-of-range or wrongly-typed field so a corrupted or
 * hand-edited persisted document surfaces the same way an invalid autonomy level does.
 */
const parseDetectionConfig = (
  workerId: RegisteredWorkerId,
  raw: unknown
): DetectionConfigValues | undefined => {
  const defaults = WORKER_DETECTION_CONFIG_DEFAULTS[workerId];
  if (defaults === undefined) {
    return undefined;
  }
  if (raw === undefined) {
    return defaults;
  }
  const parsedDetectionConfig = DetectionConfig.safeParse(raw);
  if (!parsedDetectionConfig.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid detection config`);
  }
  return {
    confidenceThreshold:
      parsedDetectionConfig.data.confidenceThreshold ?? defaults.confidenceThreshold,
    fpCountThreshold: parsedDetectionConfig.data.fpCountThreshold ?? defaults.fpCountThreshold,
  };
};

const readAnalysisWindowDays = (values: WorkerTemplateValues): number | undefined =>
  'analysisWindowDays' in values && typeof values.analysisWindowDays === 'number'
    ? values.analysisWindowDays
    : undefined;

const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): WorkerTemplateValues => {
  const currentVersion = WORKER_SETTINGS_VERSIONS[workerId];
  const { settingsVersion, autonomyLevel, scheduleInterval, detectionConfig, analysisWindowDays } =
    raw;
  if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
    throw new Error(
      `Unsupported settings version for AlertZero worker "${workerId}": ${String(settingsVersion)}`
    );
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(`AlertZero worker "${workerId}" settings contain an invalid autonomy level`);
  }
  const parsedDetectionConfig = parseDetectionConfig(workerId, detectionConfig);

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
    ...(parsedDetectionConfig === undefined ? {} : { detectionConfig: parsedDetectionConfig }),
  };
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => ({
  createDefaultValues: (): WorkerTemplateValues => {
    const scheduleDefault = WORKER_SCHEDULE_DEFAULTS[workerId];
    const detectionConfigDefault = WORKER_DETECTION_CONFIG_DEFAULTS[workerId];
    const analysisWindowDefault = WORKER_ANALYSIS_WINDOW_DEFAULTS[workerId];
    return {
      settingsVersion: WORKER_SETTINGS_VERSIONS[workerId],
      autonomyLevel: 'manual',
      ...(scheduleDefault === undefined ? {} : { scheduleInterval: scheduleDefault }),
      ...(detectionConfigDefault === undefined ? {} : { detectionConfig: detectionConfigDefault }),
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
    if (patch.detectionConfig != null && WORKER_DETECTION_CONFIG_DEFAULTS[workerId] === undefined) {
      return { rejected: 'a detection config' };
    }
    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomy ?? values.autonomyLevel,
        ...(patch.scheduleInterval == null ? {} : { scheduleInterval: patch.scheduleInterval }),
        ...(patch.detectionConfig == null
          ? {}
          : {
              detectionConfig: {
                ...readDetectionConfig(values),
                ...patch.detectionConfig,
              },
            }),
        ...(patch.analysisWindowDays == null
          ? {}
          : { analysisWindowDays: patch.analysisWindowDays }),
      },
    };
  },
  toSettings: (raw): WorkerSettings => {
    const values = parseWorkerValues(workerId, raw);
    const scheduleInterval = readScheduleInterval(values);
    const detectionConfig = readDetectionConfig(values);
    const analysisWindowDays = readAnalysisWindowDays(values);
    return parseCompleteWorkerSettings({
      workerId,
      autonomy: values.autonomyLevel,
      // Spread rather than assign undefined: the registry test asserts the projection's keys
      // survive WorkerSettings.parse unchanged.
      ...(scheduleInterval === undefined ? {} : { scheduleInterval }),
      ...(detectionConfig === undefined ? {} : { detectionConfig }),
      ...(analysisWindowDays === undefined ? {} : { analysisWindowDays }),
    });
  },
});
