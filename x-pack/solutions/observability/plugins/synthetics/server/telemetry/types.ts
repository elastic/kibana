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
