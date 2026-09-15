/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerSettings, WorkerSettingsWrite } from './schemas';
import {
  AlertTriageWorkerSettings,
  RuleTuningWorkerSettings,
  ScheduledWorkerSettings,
  SharedOnlyWorkerSettings,
} from './schemas';

/**
 * The per-Worker complete schema is the single capability declaration
 * (worker-settings-page-decisions-3, item 14): which shared settings a Worker
 * owns and which extras keys exist are both read off these shapes. No parallel
 * hand-maintained lists — the consistency test in worker_settings_contract.test.ts
 * fails if a complete schema and a derived capability disagree.
 */
const COMPLETE_WORKER_SETTINGS_SCHEMAS = {
  ruleTuning: RuleTuningWorkerSettings,
  alertTriage: AlertTriageWorkerSettings,
  scheduled: ScheduledWorkerSettings,
  sharedOnly: SharedOnlyWorkerSettings,
} as const;

export const getCompleteWorkerSettingsSchema = (workerId: string) => {
  if (workerId === 'system-security-detection-rule-tuning') {
    return COMPLETE_WORKER_SETTINGS_SCHEMAS.ruleTuning;
  }
  if (workerId === 'system-security-floor-alert-triage') {
    return COMPLETE_WORKER_SETTINGS_SCHEMAS.alertTriage;
  }
  if (workerId === 'system-security-floor-attack-discovery') {
    return COMPLETE_WORKER_SETTINGS_SCHEMAS.scheduled;
  }
  return COMPLETE_WORKER_SETTINGS_SCHEMAS.sharedOnly;
};

const WORKER_IDS_WITH_COMPLETE_SCHEMA = [
  'system-security-detection-rule-tuning',
  'system-security-floor-alert-triage',
  'system-security-floor-attack-discovery',
  'system-security-dark-continuous-threat-hunt',
  'system-security-detection-rule-creation',
] as const;

/**
 * True when the Worker's complete schema owns the scheduleInterval field,
 * established by probing the schema with scheduleInterval present: a Worker
 * that owns no schedule rejects the probe because the strict schema flags the
 * key as unrecognized. Schema-derived; no parallel list to keep in sync.
 */
/**
 * Reads the object shape off a complete Worker settings schema. The generated schemas are
 * wrapped in `lazySchema`, so the shape is resolved through the zod def rather than assumed —
 * introspection, not error-message parsing, is what keeps these capabilities honest when zod
 * changes its wording.
 */
const getSchemaShape = (schema: {
  safeParse: (value: unknown) => unknown;
}): Record<string, unknown> => {
  const resolved = schema as unknown as {
    _def?: { shape?: Record<string, unknown> | (() => Record<string, unknown>) };
    shape?: Record<string, unknown>;
  };
  const shape = resolved.shape ?? resolved._def?.shape;
  if (typeof shape === 'function') {
    return shape();
  }
  return shape ?? {};
};

/**
 * True when the Worker's complete schema declares scheduleInterval. Schema-derived; no parallel
 * list to keep in sync (worker-settings-page-decisions-3, item 14).
 */
export const workerOwnsSchedule = (workerId: string): boolean =>
  'scheduleInterval' in getSchemaShape(getCompleteWorkerSettingsSchema(workerId));

/**
 * Watch-owned extras field names this Worker declares, read off the nested extras schema.
 * Schema-derived; no parallel list.
 */
export const getWorkerExtrasFields = (workerId: string): readonly string[] => {
  const extrasSchema = getSchemaShape(getCompleteWorkerSettingsSchema(workerId)).extras;
  if (extrasSchema === undefined) {
    return [];
  }
  return Object.keys(getSchemaShape(extrasSchema as { safeParse: (value: unknown) => unknown }));
};

const ALL_AUTONOMY_LEVELS = ['manual', 'assisted', 'supervised'] as const;

export type WorkerAutonomyLevel = (typeof ALL_AUTONOMY_LEVELS)[number];

/**
 * Autonomy levels the Worker's complete schema accepts (item 3). Derived by probing each level
 * against that schema, exactly like schedule and extras ownership — a Worker that narrows its
 * autonomy enum in the schema automatically narrows here, with no parallel list to drift.
 */
export const getAllowedAutonomyLevels = (workerId: string): readonly WorkerAutonomyLevel[] => {
  const autonomySchema = getSchemaShape(getCompleteWorkerSettingsSchema(workerId)).autonomy as
    | { safeParse: (value: unknown) => { success: boolean } }
    | undefined;
  if (autonomySchema === undefined) {
    return ALL_AUTONOMY_LEVELS;
  }
  return ALL_AUTONOMY_LEVELS.filter((level) => autonomySchema.safeParse(level).success);
};

export const parseCompleteWorkerSettings = (settings: WorkerSettings): WorkerSettings =>
  getCompleteWorkerSettingsSchema(settings.workerId).parse(settings);

const WRONG_WORKER_REJECTIONS: Record<string, string> = {
  scheduleInterval: 'a schedule interval',
  analysisWindowDays: 'an analysis window',
};

export const rejectUnsupportedWorkerSettingsWrite = (
  workerId: string,
  settings: WorkerSettingsWrite
): string | undefined => {
  if (settings.autonomy != null) {
    const allowed = getAllowedAutonomyLevels(workerId);
    if (!allowed.includes(settings.autonomy as WorkerAutonomyLevel)) {
      return `autonomy level '${settings.autonomy}' (this Worker allows ${allowed.join(', ')})`;
    }
  }
  if (settings.scheduleInterval != null && !workerOwnsSchedule(workerId)) {
    return WRONG_WORKER_REJECTIONS.scheduleInterval;
  }
  if (settings.extras != null) {
    const owned = getWorkerExtrasFields(workerId);
    const wrong = Object.keys(settings.extras).find((field) => !owned.includes(field));
    if (wrong !== undefined) {
      return WRONG_WORKER_REJECTIONS[wrong] ?? `a ${wrong} setting`;
    }
  }
  return undefined;
};

export const touchesWorkerSettings = (patch: {
  settings?: WorkerSettingsWrite | undefined;
}): boolean => patch.settings != null;

/**
 * Consistency guard (item 14): every registered Worker id must resolve to a
 * complete schema, and the derived capabilities must cover at least one Worker
 * owning the schedule and at least one owning extras — catching a schema edit
 * that silently drifts from the derived capability set.
 */
export const assertWorkerSettingsContractConsistency = (): void => {
  for (const workerId of WORKER_IDS_WITH_COMPLETE_SCHEMA) {
    getCompleteWorkerSettingsSchema(workerId); // throws-free resolution
  }
  const scheduleOwners = WORKER_IDS_WITH_COMPLETE_SCHEMA.filter(workerOwnsSchedule);
  if (scheduleOwners.length === 0) {
    throw new Error('No Worker owns scheduleInterval — complete schemas drifted from capabilities');
  }
  const extrasOwners = WORKER_IDS_WITH_COMPLETE_SCHEMA.filter(
    (id) => getWorkerExtrasFields(id).length > 0
  );
  if (extrasOwners.length === 0) {
    throw new Error('No Worker owns extras fields — complete schemas drifted from capabilities');
  }
  for (const workerId of WORKER_IDS_WITH_COMPLETE_SCHEMA) {
    if (getAllowedAutonomyLevels(workerId).length === 0) {
      throw new Error(
        `Worker ${workerId} allows no autonomy level — complete schema drifted from capabilities`
      );
    }
  }
};
