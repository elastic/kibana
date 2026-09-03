/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateWorkerRequestBody, WorkerSettings } from '@kbn/pnd-common';
import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';

export type WorkerSettingsPatch = Pick<UpdateWorkerRequestBody, 'autonomyLevel'>;

export interface WorkerSettingsRegistration {
  createDefaultValues(): ManagedWorkflowTemplateValues;
  migrate(values: Record<string, unknown>): {
    values: ManagedWorkflowTemplateValues;
    migrated: boolean;
  };
  applyPatch(
    values: ManagedWorkflowTemplateValues,
    patch: WorkerSettingsPatch
  ): { values: ManagedWorkflowTemplateValues } | { rejected: string };
  /** Return the raw projection; the registry test guards against API schema stripping. */
  toSettings(values: ManagedWorkflowTemplateValues): WorkerSettings;
}
