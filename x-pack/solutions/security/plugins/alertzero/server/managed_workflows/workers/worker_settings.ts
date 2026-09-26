/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
} from '@kbn/alertzero-common';
import {
  applyWorkerSettingsWrite,
  createDefaultWorkerSettings,
  formatWorkerSettingsIssues,
  getCompleteWorkerSettingsSchema,
  getWorkerSettingsDeclaration,
  migrateStoredTemplateValues,
  type WorkerSettings,
  type WorkerSettingsMigration,
} from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { WorkerSettingsRegistration } from './types';

/**
 * Idempotent renames of fields every Worker stores. Each step runs before the per-worker chain and
 * must return the same object when the old key is absent. Adding one requires the parser below to
 * accept the new key in the same change. See
 * `kbn-alertzero-common/impl/worker_settings/README.md`.
 */
export const SHARED_FIELD_MIGRATIONS: readonly WorkerSettingsMigration[] = [];

type RegisteredWorkerId =
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
  | typeof SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID
  | typeof SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID;

/**
 * Template values mirror the settings API: shared fields flat (with the legacy `autonomyLevel`
 * key the YAML templates read), Worker-specific fields nested under `extras`.
 */
const toTemplateValues = (
  workerId: RegisteredWorkerId,
  settings: WorkerSettings
): ManagedWorkflowTemplateValues => ({
  settingsVersion: getWorkerSettingsDeclaration(workerId).settingsVersion,
  autonomyLevel: settings.autonomy,
  ...(settings.scheduleInterval === undefined
    ? {}
    : { scheduleInterval: settings.scheduleInterval }),
  ...(settings.extras === undefined ? {} : { extras: settings.extras }),
});

const migrateStoredValues = (
  workerId: RegisteredWorkerId,
  raw: ManagedWorkflowTemplateValues
): ManagedWorkflowTemplateValues =>
  migrateStoredTemplateValues(getWorkerSettingsDeclaration(workerId), raw, SHARED_FIELD_MIGRATIONS);

/**
 * Reads persisted template values through the settings migration, then validates them. A present
 * invalid value still throws, and the Worker projects as unavailable.
 */
const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): WorkerSettings => {
  const currentVersion = getWorkerSettingsDeclaration(workerId).settingsVersion;
  const { settingsVersion, autonomyLevel, scheduleInterval, extras, ...unsupported } =
    migrateStoredValues(workerId, raw);
  if (settingsVersion !== currentVersion) {
    throw new Error(
      `Unsupported settings version for AlertZero worker "${workerId}": ${String(settingsVersion)}`
    );
  }
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
    autonomy: autonomyLevel,
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
  migrateStoredValues: (raw) => migrateStoredValues(workerId, raw),
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
