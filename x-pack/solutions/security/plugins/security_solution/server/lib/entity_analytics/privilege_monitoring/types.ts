/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MonitoringLabel,
  MonitoringEntitySource,
} from '../../../../common/api/entity_analytics';

export type PrivMonUserSource = 'csv' | 'api' | 'index_sync' | 'entity_analytics_integration';

export interface PrivMonBulkUser {
  username: string;
  existingUserId?: string;
  sourceId: string;
  monitoringLabels?: MonitoringLabel[];
  isPrivileged: boolean;
}

export type MonitoringEntitySyncType = 'entity_analytics_integration' | 'index';

export type PartialMonitoringEntitySource = Partial<MonitoringEntitySource> & { id: string };
