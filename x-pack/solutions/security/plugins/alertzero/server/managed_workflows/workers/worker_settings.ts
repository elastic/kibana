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

/**
 * Reads persisted template values back into complete settings, exactly as stored: nothing is
 * defaulted or merged in, and a document from an older development shape fails here so the
 * Worker projects as unavailable until that state is reset.
 *
 * The one exception is the autonomy level: a Worker that narrows its declaration leaves documents
 * holding a level it no longer offers, which is not a version change and so has nothing to migrate
 * on. Those read as the closest level the Worker still offers that is no more autonomous (see
 * `projectStoredAutonomyLevel`); the next save persists the projection.
 */
const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  raw: Record<string, unknown>
): WorkerSettings => {
  const currentVersion = WORKER_SETTINGS_VERSIONS[workerId];
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
