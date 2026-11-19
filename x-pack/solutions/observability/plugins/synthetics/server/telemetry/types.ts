/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface MonitorUpdateEvent {
  updatedAt?: string;
  lastUpdatedAt?: string;
  durationSinceLastUpdated?: number;
  deletedAt?: string;
  type: string;
  stackVersion: string;
  monitorNameLength: number;
  monitorInterval: number;
  locations: string[];
  locationsCount: number;
  scriptType?: 'inline' | 'recorder' | 'zip' | 'project';
  revision?: number;
  errors?: Array<{ locationId: string; error: { status?: number; reason?: string } }>;
  configId: string;
  issuedTo?: string;
}

export interface MonitorErrorEvent {
  type: string;
  message: string;
  reason?: string;
  code?: string;
  status?: number;
  url?: string;
  stackVersion: string;
  issuedTo?: string;
}

export type PrivateLocationRebalanceReason =
  | 'failover'
  | 'recovery'
  | 'rebalance'
  | 'move_failed'
  | 'no_healthy_agents'
  | 'error';

export interface PrivateLocationRebalanceEvent {
  locationHash: string;
  reason: PrivateLocationRebalanceReason;
  agentsTotal: number;
  agentsHealthy: number;
  agentsStale: number;
  agentsEvicted: number;
  agentsRecovered: number;
  agentsRecoveryEligible: number;
  livenessVetoSavedAgents: number;
  monitorsTotal: number;
  monitorsMoved: number;
  monitorsFailedOver: number;
  monitorsUnpinned: number;
  moveFailures: number;
  durationMs: number;
  stackVersion: string;
  issuedTo?: string;
}

export interface PrivateLocationShardingSnapshotEvent {
  locationHash: string;
  agentsTotal: number;
  agentsHealthy: number;
  agentsWithCapacity: number;
  monitorsTotal: number;
  browserMonitors: number;
  monitorsPerAgentMin: number;
  monitorsPerAgentMedian: number;
  monitorsPerAgentMax: number;
  /** max / mean monitors per healthy agent; 1 is perfectly even. */
  skewRatio: number;
  stackVersion: string;
  issuedTo?: string;
}

export type PrivateLocationShardingMode = 'active' | 'switch_off' | 'unlicensed';

export interface PrivateLocationShardingStateEvent {
  event: 'mode_changed' | 'pin_drain';
  mode: PrivateLocationShardingMode;
  previousMode?: PrivateLocationShardingMode;
  pinsCleared: number;
  pinsFailed: number;
  drainAttempt: number;
  stackVersion: string;
  issuedTo?: string;
}
