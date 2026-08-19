/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WatchAutonomyLevel, WatchSettings } from '@kbn/pnd-common';
import {
  PND_WATCH_FLOOR_WORKFLOW_ID,
  type ManagedWorkflowTemplateValuesForId,
} from '@kbn/workflows/managed';
import type { WatchSettingsRegistration } from './types';

export type WatchFloorTemplateValues = ManagedWorkflowTemplateValuesForId<
  typeof PND_WATCH_FLOOR_WORKFLOW_ID
>;

const WATCH_FLOOR_SETTINGS_VERSION = 1;

const parseWatchFloorValues = (raw: Record<string, unknown>): WatchFloorTemplateValues => {
  const { settingsVersion, autonomyLevel } = raw;
  if (settingsVersion !== undefined && settingsVersion !== WATCH_FLOOR_SETTINGS_VERSION) {
    throw new Error(`Unsupported Watch Floor settings version: ${String(settingsVersion)}`);
  }
  const parsedAutonomyLevel = WatchAutonomyLevel.safeParse(autonomyLevel);
  if (!parsedAutonomyLevel.success) {
    throw new Error('Watch Floor settings contain an invalid autonomy level');
  }
  return {
    settingsVersion: WATCH_FLOOR_SETTINGS_VERSION,
    autonomyLevel: parsedAutonomyLevel.data,
  };
};

export const watchFloorSettings = {
  createDefaultValues: (): WatchFloorTemplateValues => ({
    settingsVersion: WATCH_FLOOR_SETTINGS_VERSION,
    autonomyLevel: 'manual',
  }),
  migrate: (raw: Record<string, unknown>) => {
    const values = parseWatchFloorValues(raw);
    return {
      values,
      migrated:
        raw.settingsVersion !== WATCH_FLOOR_SETTINGS_VERSION ||
        Object.keys(raw).some((key) => !(key in values)),
    };
  },
  applyPatch: (raw, patch) => {
    const values = parseWatchFloorValues(raw);
    if (patch.triggers) return { rejected: 'trigger settings' };
    if (patch.scopeRouting) return { rejected: 'scope and routing settings' };
    if (patch.approvalGate) {
      return { rejected: `approval gate "${patch.approvalGate.gateId}"` };
    }
    if (patch.worker) return { rejected: `worker "${patch.worker.workerId}"` };
    if (patch.skill) return { rejected: `skill "${patch.skill.skillId}"` };

    return {
      values: {
        ...values,
        autonomyLevel: patch.autonomyLevel ?? values.autonomyLevel,
      },
    };
  },
  toSettings: (raw) => {
    const values = parseWatchFloorValues(raw);
    return WatchSettings.parse({
      watchId: PND_WATCH_FLOOR_WORKFLOW_ID,
      autonomy: values.autonomyLevel,
    });
  },
} satisfies WatchSettingsRegistration;
