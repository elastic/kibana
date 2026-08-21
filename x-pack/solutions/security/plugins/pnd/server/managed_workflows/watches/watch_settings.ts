/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SYSTEM_SECURITY_WATCH_DARK_ID,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_DETECTION_ID,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_OFFICER_ID,
  WatchAutonomyLevel,
} from '@kbn/pnd-common';
import type { SYSTEM_SECURITY_WATCH_IDS } from '@kbn/pnd-common';
import type { ManagedWorkflowTemplateValuesForId } from '@kbn/workflows/managed';
import type { WatchSettingsRegistration } from './types';

type RegisteredWatchId = (typeof SYSTEM_SECURITY_WATCH_IDS)[number];
type WatchTemplateValues = ManagedWorkflowTemplateValuesForId<RegisteredWatchId>;

const WATCH_SETTINGS_VERSIONS: Record<RegisteredWatchId, number> = {
  [SYSTEM_SECURITY_WATCH_FLOOR_ID]: 1,
  [SYSTEM_SECURITY_WATCH_OFFICER_ID]: 1,
  [SYSTEM_SECURITY_WATCH_DARK_ID]: 1,
  [SYSTEM_SECURITY_WATCH_DEEP_ID]: 1,
  [SYSTEM_SECURITY_WATCH_DETECTION_ID]: 1,
};

const parseWatchValues = (watchId: RegisteredWatchId, raw: Record<string, unknown>) => {
  const currentVersion = WATCH_SETTINGS_VERSIONS[watchId];
  const { settingsVersion, autonomyLevel } = raw;
  if (settingsVersion !== undefined && settingsVersion !== currentVersion) {
    throw new Error(
      `Unsupported settings version for PND watch "${watchId}": ${String(settingsVersion)}`
    );
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error(`PND watch "${watchId}" settings contain an invalid autonomy level`);
  }
  return {
    settingsVersion: currentVersion,
    autonomyLevel: parsedAutonomyLevel.data,
  } satisfies WatchTemplateValues;
};

export const createWatchSettingsRegistration = (
  watchId: RegisteredWatchId
): WatchSettingsRegistration => ({
  createDefaultValues: (): WatchTemplateValues => ({
    settingsVersion: WATCH_SETTINGS_VERSIONS[watchId],
    autonomyLevel: 'manual',
  }),
  migrate: (raw: Record<string, unknown>) => {
    const values = parseWatchValues(watchId, raw);
    return {
      values,
      migrated:
        raw.settingsVersion !== WATCH_SETTINGS_VERSIONS[watchId] ||
        Object.keys(raw).some((key) => !Object.hasOwn(values, key)),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseWatchValues(watchId, raw);
    if (patch.triggers) return { rejected: 'trigger settings' };
    if (patch.scopeRouting) return { rejected: 'scope and routing settings' };
    if (patch.approvalGate) {
      return { rejected: `approval gate "${patch.approvalGate.gateId}"` };
    }
    if (patch.worker) return { rejected: `worker "${patch.worker.workerId}"` };
    if (patch.skill) return { rejected: `skill "${patch.skill.skillId}"` };
    if (patch.dark) return { rejected: 'dark watch settings' };

    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
      },
    };
  },
  toSettings: (raw) => {
    const values = parseWatchValues(watchId, raw);
    return {
      watchId,
      autonomy: values.autonomyLevel,
    };
  },
});
