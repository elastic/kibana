/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WorkerSettings, WorkerSettingsWrite } from '@kbn/alertzero-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';

export type WorkerSettingsPatch = WorkerSettingsWrite;

export interface WorkerSettingsRegistration {
  createDefaultValues(): ManagedWorkflowTemplateValues;
  migrate(values: Record<string, unknown>): {
    values: ManagedWorkflowTemplateValues;
    migrated: boolean;
  };
  /**
   * Composes the patched settings and validates them against the Worker's complete schema.
   * `invalid` carries the issues, each naming its field.
   */
  applyPatch(
    values: ManagedWorkflowTemplateValues,
    patch: WorkerSettingsPatch
  ): { values: ManagedWorkflowTemplateValues } | { invalid: string };
  /** Return the raw projection; the registry test guards against API schema stripping. */
  toSettings(values: ManagedWorkflowTemplateValues): WorkerSettings;
}
