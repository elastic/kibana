/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type PrivMonUserSource = 'csv' | 'api' | 'index_sync';

export interface PrivMonBulkUser {
  username: string;
  existingUserId?: string;
  sourceId: string;
}

export interface PrivMonOktaIntegrationsUser {
  id: string;
  username: string;
  email: string | undefined;
  roles: string[];
  sourceId: string;
  existingUserId: undefined;
  lastSeen: string;
  isPrivileged: true;
}

export type MonitoringEntitySourceType = 'entity_analytics_integration' | 'index';
