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
   * Brings persisted values up to the current declaration: fills schedule and extras keys the
   * document does not have yet, and lowers an autonomy level the Worker no longer allows to the
   * nearest allowed level below it. Returns the same object when nothing changes. No other
   * present value is replaced.
   */
  upgradeStoredValues(values: ManagedWorkflowTemplateValues): ManagedWorkflowTemplateValues;
  /**
   * Parses persisted template values into complete settings, after the same upgrade the startup
   * pass writes back. Throws when a present value does not match the current shape.
   */
  toSettings(values: ManagedWorkflowTemplateValues): WorkerSettings;
}
