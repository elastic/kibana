/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsConfig } from '../types';

export type PrivMonUserSource = 'csv' | 'api' | 'index_sync';
export type SyncIntervalConfig =
  EntityAnalyticsConfig['monitoring']['privileges']['developer']['syncInterval'];

export interface PrivMonBulkUser {
  username: string;
  indexName: string;
  existingUserId?: string;
}
