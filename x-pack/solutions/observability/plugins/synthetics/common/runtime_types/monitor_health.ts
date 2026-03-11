/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export enum LocationHealthStatusValue {
  Healthy = 'healthy',
  MissingPackagePolicy = 'missing_package_policy',
  MissingAgentPolicy = 'missing_agent_policy',
  AgentPolicyMismatch = 'agent_policy_mismatch',
  MissingLocation = 'missing_location',
  PackageNotInstalled = 'package_not_installed',
}

export interface LocationHealthStatus {
  locationId: string;
  locationLabel: string;
  status: LocationHealthStatusValue;
  policyId: string;
  reason?: string;
}

export interface MonitorHealthStatus {
  configId: string;
  monitorName: string;
  isUnhealthy: boolean;
  locations: LocationHealthStatus[];
}

export interface MonitorHealthError {
  configId: string;
  error: string;
  statusCode?: number;
}

export interface MonitorsHealthResponse {
  monitors: MonitorHealthStatus[];
  errors: MonitorHealthError[];
}
