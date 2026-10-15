/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTZERO_ENABLED_SETTING_ID } from '@kbn/alertzero-common';
import { workerRegistry, type WorkerRegistration } from '../../managed_workflows/worker_registry';
import {
  ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG,
  ATTACK_DISCOVERY_WORKFLOWS_SETTING_ID,
  type SpaceSnapshot,
  type SpaceWorkerSnapshot,
} from '../../telemetry';
import { readInstalledWorker } from './read_installed_worker';
import type { TelemetrySnapshotManagedWorkflows, TelemetrySnapshotSettingsReader } from './types';

const readBooleanSetting = async (
  uiSettingsClient: TelemetrySnapshotSettingsReader,
  key: string
): Promise<boolean> => (await uiSettingsClient.get(key)) === true;

const isInstalled = (worker: SpaceWorkerSnapshot | undefined): worker is SpaceWorkerSnapshot =>
  worker !== undefined;

const readInstalledWorkers = async ({
  managedWorkflows,
  registrations,
  spaceId,
}: {
  managedWorkflows: TelemetrySnapshotManagedWorkflows | undefined;
  registrations: readonly WorkerRegistration[];
  spaceId: string;
}): Promise<SpaceWorkerSnapshot[]> =>
  managedWorkflows
    ? (
        await Promise.all(
          registrations.map((registration) =>
            readInstalledWorker({ managedWorkflows, registration, spaceId })
          )
        )
      ).filter(isInstalled)
    : [];

/**
 * Reads one space's flags and, given managed workflows, its installed Workers; rejects when any
 * read fails.
 */
export const collectSpaceSnapshot = async ({
  attackDiscoveryWorkflowsEnabled,
  managedWorkflows,
  registrations = workerRegistry.list(),
  spaceId,
  uiSettingsClient,
}: {
  /** The deployment-wide flag, read once per run: it has no per-space value. */
  attackDiscoveryWorkflowsEnabled: boolean;
  /** Absent when service accounts are off: AlertZero manages no Workers then, so none are read. */
  managedWorkflows?: TelemetrySnapshotManagedWorkflows;
  registrations?: readonly WorkerRegistration[];
  spaceId: string;
  uiSettingsClient: TelemetrySnapshotSettingsReader;
}): Promise<SpaceSnapshot> => {
  const [alertZeroEnabled, attackDiscoveryWorkflowsSettingEnabled, workers] = await Promise.all([
    readBooleanSetting(uiSettingsClient, ALERTZERO_ENABLED_SETTING_ID),
    readBooleanSetting(uiSettingsClient, ATTACK_DISCOVERY_WORKFLOWS_SETTING_ID),
    readInstalledWorkers({ managedWorkflows, registrations, spaceId }),
  ]);

  return {
    flags: {
      [ALERTZERO_ENABLED_SETTING_ID]: alertZeroEnabled,
      [ATTACK_DISCOVERY_WORKFLOWS_FEATURE_FLAG]: attackDiscoveryWorkflowsEnabled,
      [ATTACK_DISCOVERY_WORKFLOWS_SETTING_ID]: attackDiscoveryWorkflowsSettingEnabled,
    },
    workers,
  };
};
