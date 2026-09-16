/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_TRIAGE_SETTINGS,
  SYSTEM_SECURITY_WORKER_DARK_CONTINUOUS_THREAT_HUNT_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_CREATION_ID,
  SYSTEM_SECURITY_WORKER_DETECTION_RULE_TUNING_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
  SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
  WatchAutonomyLevel,
  type WorkerSettingsDeclaration,
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

/** Creates a WorkerSettingsRegistration from a declaration, supporting optional extras. */
const createRegistrationFromDeclaration = <TExtras extends Record<string, unknown>>(
  workerId: RegisteredWorkerId,
  declaration: WorkerSettingsDeclaration<TExtras>
): WorkerSettingsRegistration => {
  const currentVersion = WORKER_SETTINGS_VERSIONS[workerId];
  const scheduleDefault = WORKER_SCHEDULE_DEFAULTS[workerId];
  const extrasDecl = declaration.extras;

  const parseBase = (raw: Record<string, unknown>) => {
    const { settingsVersion, autonomyLevel, scheduleInterval } = raw;
    if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
      throw new Error(
        `Unsupported settings version for AlertZero worker "${workerId}": ${String(
          settingsVersion
        )}`
      );
    }
    const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
    if (!parsedAutonomyLevel.success) {
      throw new Error(`AlertZero worker "${workerId}" settings contain an invalid autonomy level`);
    }
    return {
      settingsVersion: currentVersion,
      autonomyLevel: parsedAutonomyLevel.data,
      ...(scheduleDefault !== undefined
        ? { scheduleInterval: String(scheduleInterval ?? scheduleDefault) }
        : {}),
    };
  };

  const parseExtras = (raw: Record<string, unknown>): TExtras | undefined => {
    if (!extrasDecl) return undefined;
    // Strip base keys to isolate extras fields before validating.
    const { settingsVersion: _sv, autonomyLevel: _al, scheduleInterval: _si, ...extrasRaw } = raw;
    const result = extrasDecl.schema.safeParse(extrasRaw);
    // Fall back to defaultValue when stored state predates the extras declaration.
    return result.success ? result.data : extrasDecl.defaultValue;
  };

  return {
    createDefaultValues: (): WorkerTemplateValues =>
      ({
        settingsVersion: currentVersion,
        autonomyLevel: 'manual',
        ...(scheduleDefault !== undefined ? { scheduleInterval: scheduleDefault } : {}),
        ...(extrasDecl?.defaultValue ?? {}),
      } as unknown as WorkerTemplateValues),

    migrate: (raw: Record<string, unknown>) => {
      const base = parseBase(raw);
      const extras = parseExtras(raw) ?? {};
      const values = { ...base, ...extras } as unknown as WorkerTemplateValues;
      const migrated =
        raw.settingsVersion !== currentVersion ||
        Object.keys(raw).some((key) => !Object.hasOwn(values as Record<string, unknown>, key));
      return { values, migrated };
    },

    applyPatch: (raw, patch) => {
      const base = parseBase(raw as Record<string, unknown>);
      const currentExtras = parseExtras(raw as Record<string, unknown>) ?? {};

      if (patch.scheduleInterval != null && scheduleDefault === undefined) {
        return { rejected: 'a schedule interval' };
      }

      let newExtras: TExtras | undefined;
      if (patch.extras != null) {
        if (!extrasDecl) {
          return { rejected: 'extras for a Worker with no extras declaration' };
        }
        const extrasResult = extrasDecl.schema.strict().safeParse(patch.extras);
        if (!extrasResult.success) {
          return { rejected: `invalid extras: ${extrasResult.error.message}` };
        }
        newExtras = extrasResult.data;
      }

      const values = {
        ...base,
        autonomyLevel: patch.autonomyLevel ?? base.autonomyLevel,
        ...(patch.scheduleInterval != null ? { scheduleInterval: patch.scheduleInterval } : {}),
        ...currentExtras,
        ...(newExtras ?? {}),
      } as unknown as WorkerTemplateValues;
      return { values };
    },

    toSettings: (raw): WorkerSettings => {
      const base = parseBase(raw as Record<string, unknown>);
      const extras = parseExtras(raw as Record<string, unknown>);
      return {
        workerId,
        autonomy: base.autonomyLevel,
        // Spread rather than assign undefined: the registry test asserts the projection's keys
        // survive WorkerSettings.parse unchanged.
        ...(base.scheduleInterval !== undefined ? { scheduleInterval: base.scheduleInterval } : {}),
        ...(extras !== undefined ? { extras: extras as Record<string, unknown> } : {}),
      };
    },
  };
};

export const createWorkerSettingsRegistration = (
  workerId: RegisteredWorkerId
): WorkerSettingsRegistration => {
  if (workerId === SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID) {
    return createRegistrationFromDeclaration(workerId, ALERT_TRIAGE_SETTINGS);
  }
  // Other Workers have no extras — use a base-only declaration.
  return createRegistrationFromDeclaration(workerId, {
    workerId,
    allowedAutonomyLevels: ['manual', 'assisted', 'supervised'],
  });
};
