/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Fields the monitor-details "Assigned agent" UI consumes. Intentionally slim —
 * no capacity/CPU/tags (those live on agent_stats).
 */
export interface MonitorAssignedAgent {
  agentId: string;
  host: string;
  healthy: boolean;
  agentVersion: string | null;
  /** False when the package policy is stamped but Fleet no longer lists this agent. */
  enrolled: boolean;
}

export interface MonitorLocationAssignment {
  locationId: string;
  locationLabel: string;
  isAgentSharding: boolean;
  agentPolicyId: string;
  agentPolicyName: string;
  /**
   * Agents that run this monitor at this location.
   * Sharded: 0–1 assigned agent. Classic: every enrolled agent.
   */
  agents: MonitorAssignedAgent[];
}
