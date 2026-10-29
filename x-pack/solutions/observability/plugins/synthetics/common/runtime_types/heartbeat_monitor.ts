/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SchemaOutput } from './schema_output';
import type {
  HeartbeatSyntheticsMonitorCodec,
  MonitorOriginCodec,
} from './schemas/heartbeat_monitor';
// Type-only import; the runtime value edge is external_monitor -> heartbeat_monitor.
import type { SelectedSyntheticsMonitor } from './external_monitor';

export type MonitorOrigin = SchemaOutput<typeof MonitorOriginCodec>;

/**
 * Fallback location for Heartbeat / Agent autodiscovery pings that carry no
 * `observer.name`. Lightweight Agent synthetics inputs (notably Kubernetes/
 * Docker autodiscovery) don't set a location, so these pings have no
 * `observer.name`. The overview groups pings by a composite `(monitor.id,
 * observer.name)` and the detail page aggregates locations on `observer.name`;
 * both silently drop docs missing the field. Synthesizing a placeholder
 * location keeps location-less autodiscovery monitors visible instead of
 * disappearing.
 */
export const HEARTBEAT_UNMAPPED_LOCATION_ID = 'heartbeat';

export const HEARTBEAT_UNMAPPED_LOCATION_LABEL = 'Heartbeat';

export type HeartbeatSyntheticsMonitor = SchemaOutput<typeof HeartbeatSyntheticsMonitorCodec>;

/**
 * Type guard distinguishing Heartbeat-managed monitors from local saved
 * objects. `EncryptedSyntheticsSavedMonitor` does not declare an `origin`
 * field, so consumers cannot narrow on `monitor.origin` directly without this
 * guard.
 */
export const isHeartbeatSyntheticsMonitor = (
  monitor: SelectedSyntheticsMonitor | null | undefined
): monitor is HeartbeatSyntheticsMonitor => {
  return !!monitor && 'origin' in monitor && monitor.origin === 'heartbeat';
};
