/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID,
  applyWorkerSettingsWrite,
  createDefaultWorkerSettings,
  formatWorkerSettingsIssues,
  getCompleteWorkerSettingsSchema,
  getWorkerSettingsDeclaration,
  upgradeStoredWorkerSettings,
  type WorkerSettings,
} from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { WorkerSettingsRegistration } from './types';

type RegisteredWorkerId =
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID
  | typeof SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID
  | typeof SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID
  | typeof SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID
  | typeof SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID;

const WORKER_SETTINGS_VERSIONS: Record<RegisteredWorkerId, number> = {
  // Stays at 1: the narrowed `allowedAutonomyLevels` (assisted dropped) and the new
  // `extras.autoCloseConfidenceScoreMinThreshold` field are both handled by
  // `upgradeStoredWorkerSettings`, which lowers a stored `assisted` to `manual` and backfills the
  // field onto documents that predate it. A version
  // bump here would reject every already-installed v1 document outright — the version check in
  // `parseWorkerValues` runs after those defaults are filled but rejects on the mismatch anyway.
  [SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID]: 1,
  [SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID]: 1,
  [SYSTEM_SECURITY_WORKER_FORENSICS_ENDPOINT_ANALYSIS_ID]: 1,
  [SYSTEM_SECURITY_WORKER_HUNT_CONTINUOUS_THREAT_HUNT_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID]: 1,
  [SYSTEM_SECURITY_WORKER_DETECTION_RULE_COVERAGE_ID]: 1,
};

/**
 * Template values mirror the settings API: shared fields flat (with the legacy `autonomyLevel`
 * key the YAML templates read), Worker-specific fields nested under `extras`.
 */
export const toTemplateValues = (
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
 * Reads persisted template values after the same upgrade the startup pass writes back, so the
 * settings page and the running workflow see the same values. Anything else present is left as
 * stored, so an out-of-range value still fails here and the Worker projects as unavailable.
 */
const parseWorkerValues = (
  workerId: RegisteredWorkerId,
  stored: Record<string, unknown>
): WorkerSettings => {
  const raw = upgradeStoredWorkerSettings(getWorkerSettingsDeclaration(workerId), stored);
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
  upgradeStoredValues: (raw) =>
    upgradeStoredWorkerSettings(getWorkerSettingsDeclaration(workerId), raw),
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
