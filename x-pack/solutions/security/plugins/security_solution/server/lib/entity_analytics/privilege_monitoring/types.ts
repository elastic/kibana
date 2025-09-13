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

export interface PrivMonOktaIntegrationsUser extends PrivMonBulkUser {
  id: string; // do you actually need this? I think you can use existingUserId instead
  email: string | undefined;
  roles: string[];
  lastSeen: string;
  isPrivileged: boolean;
}

export type MonitoringEntitySourceType = 'entity_analytics_integration' | 'index';
