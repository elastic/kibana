/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type HealthStatus = 'healthy' | 'unhealthy';

export interface ClusterData {
  clusterName: string;
  healthStatus: HealthStatus;
  cloudProvider: string | null;
  totalNodes: number;
  totalNamespaces: number;
  failedPods: number;
  runningPods: number;
  cpuUtilization: number | null;
  memoryUtilization: number | null;
  volumeUtilization: number | null;
}

export interface ClusterListingResponse {
  clusters: ClusterData[];
}
