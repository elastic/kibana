/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import type { RemoteSyntheticsMonitorCodec } from './schemas/remote_monitor';
// Type-only import; the runtime value edge is external_monitor -> remote_monitor.
import type { SelectedSyntheticsMonitor } from './external_monitor';

export type RemoteSyntheticsMonitor = SchemaOutput<typeof RemoteSyntheticsMonitorCodec>;

/**
 * Type guard distinguishing remote monitors from local saved objects.
 * Mirrors the `Boolean(thing.remote)` convention used by
 * `OverviewStatusMetaData` and SLO's `SLODefinition.remote` — but since
 * `EncryptedSyntheticsSavedMonitor` does not declare a `remote` field at all,
 * consumers cannot narrow on `monitor.remote` directly without this guard.
 */
export const isRemoteSyntheticsMonitor = (
  monitor: SelectedSyntheticsMonitor | null | undefined
): monitor is RemoteSyntheticsMonitor => {
  return !!monitor && 'remote' in monitor && !!monitor.remote;
};
