/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerSettingsDeclaration } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const fillMissingSchedule = (
  declaration: WorkerSettingsDeclaration,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  if (!declaration.scheduleInterval || Object.hasOwn(stored, 'scheduleInterval')) {
    return stored;
  }
  return { ...stored, scheduleInterval: declaration.scheduleInterval.defaultValue };
};

const fillMissingExtras = (
  declaration: WorkerSettingsDeclaration,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  const defaults = declaration.extras?.defaultValue;
  if (defaults === undefined) {
    return stored;
  }
  const { extras } = stored;
  if (extras === undefined) {
    return { ...stored, extras: { ...defaults } };
  }
  if (!isRecord(extras)) {
    return stored;
  }
  const missing = Object.keys(defaults).filter((key) => !Object.hasOwn(extras, key));
  if (missing.length === 0) {
    return stored;
  }
  // Stored keys win, including a present value that is out of range.
  return { ...stored, extras: { ...defaults, ...extras } };
};

/**
 * Copies declaration defaults onto keys an installed document does not have yet.
 * Returns the same object when nothing is missing, so a caller can skip a rewrite.
 */
export const applyMissingWorkerSettingDefaults = (
  declaration: WorkerSettingsDeclaration,
  stored: Record<string, unknown>
): Record<string, unknown> =>
  fillMissingExtras(declaration, fillMissingSchedule(declaration, stored));
