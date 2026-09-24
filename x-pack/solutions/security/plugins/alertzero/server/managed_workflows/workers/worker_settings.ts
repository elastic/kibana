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
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  applyWorkerSettingsWrite,
  createDefaultWorkerSettings,
  formatWorkerSettingsIssues,
  getCompleteWorkerSettingsSchema,
  getWorkerSettingsDeclaration,
  projectStoredAutonomyLevel,
  type WorkerSettings,
  type WorkerSettingsDeclaration,
} from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { WorkerSettingsRegistration } from './types';

type RegisteredWorkerId =
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
  | typeof SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID
  | typeof SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID;

const WORKER_SETTINGS_VERSIONS: Record<RegisteredWorkerId, number> = {
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 1,
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 1,
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: 1,
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID]: 1,
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

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/**
 * Fills fields the current declaration has but the document lacks, from the declaration defaults.
 * Stored keys and types are left alone so a removal, rename, or retype still fails the strict
 * schema. Additive only — not a migration chain and not a version bump.
 */
const fillDeclaredDefaults = (
  declaration: WorkerSettingsDeclaration,
  scheduleInterval: unknown,
  extras: unknown
): { scheduleInterval?: unknown; extras?: unknown } => {
  const filledScheduleInterval =
    scheduleInterval === undefined && declaration.scheduleInterval
      ? declaration.scheduleInterval.defaultValue
      : scheduleInterval;

  let filledExtras = extras;
  if (declaration.extras) {
    if (extras === undefined) {
      filledExtras = declaration.extras.defaultValue;
    } else if (isPlainObject(extras)) {
      filledExtras = { ...declaration.extras.defaultValue, ...extras };
    }
  }

  return {
    ...(filledScheduleInterval === undefined ? {} : { scheduleInterval: filledScheduleInterval }),
    ...(filledExtras === undefined ? {} : { extras: filledExtras }),
  };
};

/**
 * Reads persisted template values. A field the current declaration has but the document lacks is
 * filled from the declaration default. A stored key the schema no longer knows, a wrong type, or a
 * version mismatch still fails. Autonomy is the other exception: a level the Worker no longer
 * offers is projected rather than failing the read.
 */
const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): WorkerSettings => {
  const currentVersion = WORKER_SETTINGS_VERSIONS[workerId];
  const declaration = getWorkerSettingsDeclaration(workerId);
  const { settingsVersion, autonomyLevel, scheduleInterval, extras, ...unsupported } = raw;
  if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
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
    autonomy: projectStoredAutonomyLevel(declaration, autonomyLevel),
    ...fillDeclaredDefaults(declaration, scheduleInterval, extras),
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
