/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { z } from '@kbn/zod/v4';
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
