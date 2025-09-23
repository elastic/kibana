/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivTopHit } from './data_sources/sync/integrations/update_detection/privileged_status_match';

export type PrivMonUserSource = 'csv' | 'api' | 'index_sync' | 'entity_analytics_integration';

export interface PrivMonBulkUser {
  username: string;
  existingUserId?: string;
  sourceId?: string;
}

export interface PrivMonIntegrationsUser extends PrivMonBulkUser {
  latestDocForUser: PrivTopHit; // latest document for this user from the source index
  isPrivileged: boolean;
  labels: Record<string, unknown>;
}

export type MonitoringEntitySourceType = 'entity_analytics_integration' | 'index';
