/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ManagedWorkflowTemplateValues } from '@kbn/workflows/managed';
import type { WorkerRegistration } from '../../managed_workflows/worker_registry';
import type { AlertZeroAutonomyLevel, SpaceWorkerSnapshot } from '../../telemetry';
import type { TelemetrySnapshotManagedWorkflows } from './types';

const parseAutonomyLevel = (
  registration: WorkerRegistration,
  templateValues: ManagedWorkflowTemplateValues
): AlertZeroAutonomyLevel | undefined => {
  try {
    // `toSettings` validates the stored level against the Worker's schema, or throws.
    return registration.settings.toSettings(templateValues).autonomy;
  } catch {
    return undefined;
  }
};

/**
 * Reads one Worker's installed document in one space, like the Workers API projects it.
 * Resolves `undefined` when AlertZero has no Worker document there, or when its stored settings
 * cannot be parsed; rejects when a read fails.
 */
export const readInstalledWorker = async ({
  managedWorkflows,
  registration,
  spaceId,
}: {
  managedWorkflows: TelemetrySnapshotManagedWorkflows;
  registration: WorkerRegistration;
  spaceId: string;
}): Promise<SpaceWorkerSnapshot | undefined> => {
  const status = await managedWorkflows.getWorkflowStatus(registration.id, {
    spaceId,
    workflowIdSuffix: spaceId,
  });
  if (!status.installed || status.status === 'not_managed') {
    return undefined;
  }

  const state = await managedWorkflows.getInstalledWorkflowState(status.workflowId, spaceId);
  const autonomyLevel = state?.templateValues
    ? parseAutonomyLevel(registration, state.templateValues)
    : undefined;

  return autonomyLevel === undefined
    ? undefined
    : { autonomyLevel, enabled: Boolean(status.enabled), workerId: registration.id };
};
