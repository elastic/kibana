/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import type {
  ManagedWorkflowInstanceState,
  ManagedWorkflowStatusReport,
} from '@kbn/workflows/server/types';
import type { RegisteredWorkerId } from '../../managed_workflows/worker_registry';
import type { AlertZeroTelemetryAnalytics } from '../../telemetry';

/** The owner-bound managed workflows reads the snapshot makes, one Worker and space at a time. */
export interface TelemetrySnapshotManagedWorkflows {
  getInstalledWorkflowState: (
    workflowId: string,
    spaceId: string
  ) => Promise<Pick<ManagedWorkflowInstanceState, 'templateValues'> | null>;
  getWorkflowStatus: (
    id: RegisteredWorkerId,
    options: { spaceId: string; workflowIdSuffix: string }
  ) => Promise<
    Pick<ManagedWorkflowStatusReport, 'enabled' | 'installed' | 'status' | 'workflowId'>
  >;
}

/** Reads one space's Advanced Settings. */
export interface TelemetrySnapshotSettingsReader {
  get: (key: string) => Promise<unknown>;
}

/** Everything a snapshot run needs, resolved from the plugin's start services. */
export interface TelemetrySnapshotDependencies {
  analytics: AlertZeroTelemetryAnalytics;
  /** Reads the deployment-wide Attack Discovery Workflows feature flag. */
  getAttackDiscoveryWorkflowsEnabled: () => Promise<boolean>;
  getManagedWorkflows: () => Promise<TelemetrySnapshotManagedWorkflows | undefined>;
  /**
   * An Advanced Settings reader for one space, backed by an internal client scoped to it that
   * refuses writes, so a read never creates or upgrades the space's `config` object.
   */
  getUiSettingsClient: (spaceId: string) => TelemetrySnapshotSettingsReader;
  /** The telemetry plugin's opt-in stream; absent without the telemetry plugin (opted out). */
  isOptedIn$?: Observable<boolean>;
  listSpaceIds: (signal: AbortSignal) => Promise<string[]>;
  /**
   * Whether Kibana service accounts are on. AlertZero installs and manages Workers only when they
   * are, so with them off the snapshot reads no Workers.
   */
  serviceAccountsEnabled: boolean;
}
