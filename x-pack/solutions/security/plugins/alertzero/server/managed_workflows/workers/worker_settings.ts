/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  RULE_TUNING_DEFAULT_EXTRAS,
  applyWorkerSettingsWrite,
  createDefaultWorkerSettings,
  formatWorkerSettingsIssues,
  getCompleteWorkerSettingsSchema,
  getWorkerSettingsDeclaration,
  projectStoredAutonomyLevel,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { WorkerSettingsRegistration } from './types';

type RegisteredWorkerId =
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
  | typeof SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID;

const WORKER_SETTINGS_VERSIONS: Record<RegisteredWorkerId, number> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 1,
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 1,
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: 1,
  // 2: `extras` gained `fpCountThreshold` and `fpRateThresholdPct`.
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 2,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: 1,
};

/** Lifts one stored value set from the version it is keyed by to the next one. */
type WorkerSettingsMigration = (raw: Record<string, unknown>) => Record<string, unknown>;

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/**
 * Migration chain per Worker, keyed by the stored version each step reads. Steps run lazily, on
 * read and on write, because there is no platform migration pass; a read projects the upgraded
 * shape without rewriting the document, and the next settings save persists it.
 *
 * A step only fills what the new shape adds — a value the analyst already set is never rewritten.
 */
const WORKER_SETTINGS_MIGRATIONS: Partial<
  Record<RegisteredWorkerId, Record<number, WorkerSettingsMigration>>
> = {
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: {
    // v1 stored only `analysisWindowDays`. The two FP thresholds it never carried take the
    // defaults; a stored window keeps its value, including the pre-change default of 14.
    1: (raw) => ({
      ...raw,
      extras: { ...RULE_TUNING_DEFAULT_EXTRAS, ...asRecord(raw.extras) },
    }),
  },
};

/**
 * Upgrades stored values to the Worker's current settings version and returns them without
 * `settingsVersion`, which the caller re-stamps when it writes template values back. A version
 * this build does not recognise — a newer one, or one with no step to leave it — throws, so the
 * Worker projects as unavailable and the stored document is left untouched rather than
 * re-rendered from an old shape.
 */
const migrateWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): Record<string, unknown> => {
  const currentVersion = WORKER_SETTINGS_VERSIONS[workerId];
  // Documents written before versions were stamped predate every migration, so they start at 1.
  const storedVersion = raw.settingsVersion === undefined ? 1 : raw.settingsVersion;
  if (typeof storedVersion !== 'number' || storedVersion > currentVersion) {
    throw new Error(
      `Unsupported settings version for AlertZero worker "${workerId}": ${String(storedVersion)}`
    );
  }

  const migrations = WORKER_SETTINGS_MIGRATIONS[workerId] ?? {};
  let values = raw;
  for (let version = storedVersion; version < currentVersion; version++) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(
        `Unsupported settings version for AlertZero worker "${workerId}": ${String(storedVersion)}`
      );
    }
    values = migration(values);
  }
  const { settingsVersion, ...migrated } = values;
  return migrated;
};

/**
 * Template values mirror the settings API: shared fields flat (with the legacy `autonomyLevel`
 * key the YAML templates read), Worker-specific fields nested under `extras`.
 */
const toTemplateValues = (
  workerId: RegisteredWorkerId,
  settings: WorkerSettings
): ManagedWorkflowTemplateValues => ({
  settingsVersion: WORKER_SETTINGS_VERSIONS[workerId],
  autonomyLevel: settings.autonomy,
  ...(settings.scheduleInterval === undefined
    ? {}
    : { scheduleInterval: settings.scheduleInterval }),
  ...(settings.extras === undefined ? {} : { extras: settings.extras }),
});

/**
 * Reads persisted template values back, upgrading an older `settingsVersion` through the Worker's
 * migration chain first. Nothing else is defaulted or merged, so a document the chain cannot reach
 * fails here and the Worker projects as unavailable. Autonomy is the exception: a level the Worker
 * no longer offers is projected rather than failing the read.
 */
const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): WorkerSettings => {
  const { autonomyLevel, scheduleInterval, extras, ...unsupported } = migrateWorkerValues(
    workerId,
    raw
  );
  const unsupportedKeys = Object.keys(unsupported);
  if (unsupportedKeys.length > 0) {
    throw new Error(
      `AlertZero worker "${workerId}" settings contain unsupported fields: ${unsupportedKeys.join(
        ', '
      )}`
    );
  }

  const candidate = {
    workerId,
    autonomy: projectStoredAutonomyLevel(getWorkerSettingsDeclaration(workerId), autonomyLevel),
    ...(scheduleInterval === undefined ? {} : { scheduleInterval }),
    ...(extras === undefined ? {} : { extras }),
  };
  const parsed = getCompleteWorkerSettingsSchema(workerId).safeParse(candidate);
  if (!parsed.success) {
    throw new Error(
      `AlertZero worker "${workerId}" settings are invalid: ${formatWorkerSettingsIssues(
        parsed.error
      )}`
    );
  }
  return parsed.data;
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => ({
  createDefaultValues: () => toTemplateValues(workerId, createDefaultWorkerSettings(workerId)),
  applyPatch: (raw, patch) => {
    const next = applyWorkerSettingsWrite(parseWorkerValues(workerId, raw), patch);
    const result = getCompleteWorkerSettingsSchema(workerId).safeParse(next);
    if (!result.success) {
      return { invalid: formatWorkerSettingsIssues(result.error) };
    }
    return { values: toTemplateValues(workerId, result.data) };
  },
  toSettings: (raw) => parseWorkerValues(workerId, raw),
});
