/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum PrivateLocationHealthStatusValue {
  Healthy = 'healthy',
  MissingPackagePolicy = 'missing_package_policy',
  MissingAgentPolicy = 'missing_agent_policy',
  MissingLocation = 'missing_location',
  MissingAgents = 'missing_agents',
  UnhealthyAgent = 'unhealthy_agent',
}

export interface PrivateLocationHealthStatus {
  locationId: string;
  locationLabel: string;
  status: PrivateLocationHealthStatusValue;
  packagePolicyId: string;
  agentPolicyId?: string;
  reason?: string;
}

export interface MonitorHealthStatus {
  configId: string;
  monitorName: string;
  isHealthy: boolean;
  privateLocations: PrivateLocationHealthStatus[];
}

export interface MonitorHealthError {
  configId: string;
  message: string;
  statusCode: number;
}

export interface MonitorsHealthResponse {
  monitors: MonitorHealthStatus[];
  errors: MonitorHealthError[];
}
