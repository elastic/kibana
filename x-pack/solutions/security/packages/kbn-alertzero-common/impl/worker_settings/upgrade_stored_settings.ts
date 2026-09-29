/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WATCH_AUTONOMY_LEVELS } from '../../constants';
import type { WatchAutonomyLevel } from '../schemas';
import type { WorkerSettingsDeclaration } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isWatchAutonomyLevel = (value: unknown): value is WatchAutonomyLevel =>
  typeof value === 'string' && (WATCH_AUTONOMY_LEVELS as readonly string[]).includes(value);

const rank = (level: WatchAutonomyLevel): number => WATCH_AUTONOMY_LEVELS.indexOf(level);

/**
 * The most autonomous level in `allowed` that is strictly less autonomous than `level`, or
 * undefined when there is none. Never goes up: an unattended Worker is never made more autonomous.
 */
export const nearestLowerAutonomyLevel = (
  allowed: readonly WatchAutonomyLevel[],
  level: WatchAutonomyLevel
): WatchAutonomyLevel | undefined =>
  allowed
    .filter((candidate) => rank(candidate) < rank(level))
    .reduce<WatchAutonomyLevel | undefined>(
      (highest, candidate) =>
        highest === undefined || rank(candidate) > rank(highest) ? candidate : highest,
      undefined
    );

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
    // The Worker no longer declares extras (e.g. a dial was retired): drop a stale stored
    // value rather than let it fail the Worker's now-narrower complete schema.
    if (!Object.hasOwn(stored, 'extras')) {
      return stored;
    }
    const { extras: _extras, ...rest } = stored;
    return rest;
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

const lowerDisallowedAutonomy = (
  declaration: WorkerSettingsDeclaration,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  const { autonomyLevel } = stored;
  if (
    !isWatchAutonomyLevel(autonomyLevel) ||
    declaration.allowedAutonomyLevels.includes(autonomyLevel)
  ) {
    return stored;
  }
  const lowered = nearestLowerAutonomyLevel(declaration.allowedAutonomyLevels, autonomyLevel);
  // With nothing allowed below it, the stored level is kept for validation to reject.
  return lowered === undefined ? stored : { ...stored, autonomyLevel: lowered };
};

/**
 * Brings an installed document up to the current declaration without replacing what it chose:
 * fills schedule and extras keys it does not have yet, drops `extras` when the Worker declares
 * none, and lowers an autonomy level the Worker no longer allows to the nearest allowed level
 * below it. Returns the same object when nothing changes, so a caller can skip a rewrite.
 */
export const upgradeStoredWorkerSettings = (
  declaration: WorkerSettingsDeclaration,
  stored: Record<string, unknown>
): Record<string, unknown> =>
  lowerDisallowedAutonomy(
    declaration,
    fillMissingExtras(declaration, fillMissingSchedule(declaration, stored))
  );
