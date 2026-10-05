/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyMissingWorkerSettingDefaults } from './apply_missing_defaults';
import { projectStoredAutonomyLevel } from './contract';
import type { WorkerSettingsDeclaration, WorkerSettingsMigration } from './types';

/**
 * Copies `from` onto `to` when `to` is absent, then drops `from`. A value already stored at `to`
 * is kept. Returns the same object when `from` is absent.
 */
export const renameStoredField = (
  stored: Record<string, unknown>,
  from: string,
  to: string
): Record<string, unknown> => {
  if (!Object.hasOwn(stored, from)) {
    return stored;
  }
  const { [from]: previous, ...rest } = stored;
  if (Object.hasOwn(stored, to)) {
    return rest;
  }
  return { ...rest, [to]: previous };
};

const isUpgradeableVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;

const dropUndeclaredSchedule = (
  declaration: WorkerSettingsDeclaration,
  stored: Record<string, unknown>
): Record<string, unknown> => {
  if (declaration.scheduleInterval || !Object.hasOwn(stored, 'scheduleInterval')) {
    return stored;
  }
  const { scheduleInterval: _removed, ...rest } = stored;
  return rest;
};

/**
 * Brings stored template values up to the declaration. Shared renames run first, then the
 * Worker's version chain, then defaults for fields that are still absent. A present value is
 * never replaced. A stored version newer than the declaration, or any version that is not a
 * positive integer, is returned unchanged so validation can reject it. Returns the same object
 * when nothing changed.
 */
export const migrateStoredTemplateValues = (
  declaration: WorkerSettingsDeclaration,
  raw: Record<string, unknown>,
  sharedMigrations: readonly WorkerSettingsMigration[] = []
): Record<string, unknown> => {
  const currentVersion = declaration.settingsVersion;
  const storedVersion = raw.settingsVersion;
  if (storedVersion !== undefined && !isUpgradeableVersion(storedVersion)) {
    return raw;
  }
  if (typeof storedVersion === 'number' && storedVersion > currentVersion) {
    return raw;
  }

  let values = raw;
  const apply = (next: Record<string, unknown>) => {
    values = next;
  };

  for (const step of sharedMigrations) {
    apply(step(values));
  }

  const startVersion = typeof storedVersion === 'number' ? storedVersion : 1;
  for (let version = startVersion; version < currentVersion; version++) {
    const step = declaration.migrations?.[version - 1];
    if (!step) {
      throw new Error(
        `AlertZero worker "${
          declaration.workerId
        }" is missing a settings migration from version ${version} to ${version + 1}`
      );
    }
    apply(step(values));
    if (values.settingsVersion !== version + 1) {
      apply({ ...values, settingsVersion: version + 1 });
    }
  }

  apply(applyMissingWorkerSettingDefaults(declaration, values));

  const projected = projectStoredAutonomyLevel(declaration, values.autonomyLevel);
  if (projected !== values.autonomyLevel) {
    apply({ ...values, autonomyLevel: projected });
  }

  apply(dropUndeclaredSchedule(declaration, values));

  if (values.settingsVersion !== currentVersion) {
    apply({ ...values, settingsVersion: currentVersion });
  }

  return values;
};
