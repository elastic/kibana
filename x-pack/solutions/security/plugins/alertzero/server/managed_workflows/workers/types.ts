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
   * Composes the patched settings and validates them against the Worker's complete schema.
   * `invalid` carries the issues, each naming its field.
   */
  applyPatch(
    values: ManagedWorkflowTemplateValues,
    patch: WorkerSettingsWrite
  ): { values: ManagedWorkflowTemplateValues } | { invalid: string };
  /**
   * Parses persisted template values into complete settings. Throws when they do not match the
   * current shape; there is no repair or migration of older development state.
   */
  toSettings(values: ManagedWorkflowTemplateValues): WorkerSettings;
}
