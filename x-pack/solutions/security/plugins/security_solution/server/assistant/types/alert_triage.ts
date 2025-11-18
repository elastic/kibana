/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';

export interface ProcessAlertTriageJobParams {
  connectorId: string;
  alertId: string;
  jobId: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  logger: Logger;
}

export interface AlertTriageResult {
  jobId: string;
  alertId: string;
  success: boolean;
  error?: string;
}



