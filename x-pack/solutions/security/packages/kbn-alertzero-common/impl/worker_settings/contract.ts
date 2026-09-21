/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { z } from '@kbn/zod/v4';
import { WATCH_AUTONOMY_LEVELS } from '../../constants';
import type { WatchAutonomyLevel, WorkerSettingsWrite } from '../schemas';
import { WorkerScheduleInterval, WorkerSettings } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

/**
 * Complete, closed settings schema for one Worker; the only place its shape is spelled out. The
 * final pipe through the generic wire schema only fixes the output type — the strict per-Worker
 * object before it is what rejects unknown keys, missing extras fields and disallowed levels.
 */
export const buildCompleteWorkerSettingsSchema = (
  declaration: WorkerSettingsDeclaration
): z.ZodType<WorkerSettings> => {
  const shape: Record<string, z.ZodType> = {
    workerId: z.literal(declaration.workerId),
    autonomy: z.enum(declaration.allowedAutonomyLevels),
  };
  if (declaration.scheduleInterval) {
    shape.scheduleInterval = WorkerScheduleInterval;
  }
  if (declaration.extras) {
    shape.extras = declaration.extras.schema;
  }
  return z.object(shape).strict().pipe(WorkerSettings);
};

export const getDefaultAutonomyLevel = (
  declaration: WorkerSettingsDeclaration
): WatchAutonomyLevel =>
  declaration.allowedAutonomyLevels.includes('manual')
    ? 'manual'
    : declaration.allowedAutonomyLevels[0];

const isWatchAutonomyLevel = (value: unknown): value is WatchAutonomyLevel =>
  typeof value === 'string' && (WATCH_AUTONOMY_LEVELS as readonly string[]).includes(value);

/**
 * Projects a stored autonomy level onto the levels the Worker still offers.
 *
 * A Worker that narrows its declaration — dropping `supervised` because rule changes always pass a
 * review gate, say — leaves every document written under the wider set holding a level the
 * complete schema now rejects. That is not a settings-version change, so there is no version to
 * migrate on, and refusing to read the document would strand the Worker as unavailable with no way
 * back through the UI. Reads therefore land on the most autonomous level the Worker does offer that
 * is no more autonomous than what was stored; a declaration offering nothing at or below the stored
 * level (no `manual`) lands on the least autonomous level it does offer. Anything outside the shared
 * scale is passed through untouched so validation still reports it.
 *
 * Writes stay strict: `buildCompleteWorkerSettingsSchema` still rejects a level the declaration
 * does not offer, and a save re-serialises the projected level, so the document heals on next write.
 */
export const projectStoredAutonomyLevel = (
  declaration: WorkerSettingsDeclaration,
  stored: unknown
): unknown => {
  if (!isWatchAutonomyLevel(stored) || declaration.allowedAutonomyLevels.includes(stored)) {
    return stored;
  }
  const storedIndex = WATCH_AUTONOMY_LEVELS.indexOf(stored);
  // Never escalate: when the declaration offers nothing at or below the stored level, keep the
  // disallowed value so the complete schema marks the Worker unavailable instead of silently
  // granting more autonomy than was stored.
  const atOrBelow = declaration.allowedAutonomyLevels.filter(
    (level) => WATCH_AUTONOMY_LEVELS.indexOf(level) <= storedIndex
  );
  if (atOrBelow.length === 0) {
    return stored;
  }
  // Declaration order is not guaranteed, so pick by position on the shared scale.
  return atOrBelow.reduce((highest, level) =>
    WATCH_AUTONOMY_LEVELS.indexOf(level) > WATCH_AUTONOMY_LEVELS.indexOf(highest) ? level : highest
  );
};

export const buildDefaultWorkerSettings = (
  declaration: WorkerSettingsDeclaration
): WorkerSettings => ({
  workerId: declaration.workerId,
  autonomy: getDefaultAutonomyLevel(declaration),
  ...(declaration.scheduleInterval
    ? { scheduleInterval: declaration.scheduleInterval.defaultValue }
    : {}),
  ...(declaration.extras ? { extras: declaration.extras.defaultValue } : {}),
});

/**
 * Applies a settings patch: shared fields per-field, `extras` as a whole object. The result still
 * has to pass the Worker's complete schema; this only composes the candidate.
 */
export const applyWorkerSettingsWrite = (
  settings: WorkerSettings,
  patch: WorkerSettingsWrite
): WorkerSettings => ({
  ...settings,
  ...(patch.autonomy === undefined ? {} : { autonomy: patch.autonomy }),
  ...(patch.scheduleInterval === undefined ? {} : { scheduleInterval: patch.scheduleInterval }),
  ...(patch.extras === undefined ? {} : { extras: patch.extras }),
});

/** The minimal patch that turns `saved` into `draft`, or undefined when nothing changed. */
export const diffWorkerSettings = (
  saved: WorkerSettings,
  draft: WorkerSettings
): WorkerSettingsWrite | undefined => {
  const patch: WorkerSettingsWrite = {
    ...(draft.autonomy !== saved.autonomy ? { autonomy: draft.autonomy } : {}),
    ...(draft.scheduleInterval !== undefined && draft.scheduleInterval !== saved.scheduleInterval
      ? { scheduleInterval: draft.scheduleInterval }
      : {}),
    ...(draft.extras !== undefined && !isEqual(draft.extras, saved.extras)
      ? { extras: draft.extras }
      : {}),
  };
  return Object.keys(patch).length > 0 ? patch : undefined;
};

export const touchesWorkerSettings = (patch: {
  settings?: WorkerSettingsWrite | undefined;
}): boolean => patch.settings != null;

/** One line per issue, each prefixed with the field path so the caller can name the field. */
export const formatWorkerSettingsIssues = (error: z.ZodError): string =>
  error.issues
    .map((issue) => {
      const path = issue.path.map(String).join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
