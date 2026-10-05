/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerSettings, WorkerSettingsWrite } from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';

export interface WorkerSettingsRegistration {
  /** Template values for a fresh per-space install. */
  createDefaultValues(): ManagedWorkflowTemplateValues;
  /**
   * Runs the worker's settings migration. Returns the same object when the stored values already
   * match the current declaration. Present invalid values are left for validation to reject.
   */
  migrateStoredValues(values: ManagedWorkflowTemplateValues): ManagedWorkflowTemplateValues;
  /**
   * Composes the patched settings and validates them against the Worker's complete schema.
   * `invalid` carries the issues, each naming its field.
   */
  applyPatch(
    values: ManagedWorkflowTemplateValues,
    patch: WorkerSettingsWrite
  ): { values: ManagedWorkflowTemplateValues } | { invalid: string };
  /**
   * Parses persisted template values into complete settings. The migration runs first. A present
   * invalid value, or any other shape that still fails the current schema, throws.
   */
  toSettings(values: ManagedWorkflowTemplateValues): WorkerSettings;
}
