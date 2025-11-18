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
import { AlertTriageJob } from './alert_triage_job';
import type { AlertTriageResult } from '../../types/alert_triage';

export interface AlertTriageServiceParams {
  connectorId: string;
  alertId: string;
  jobId: string;
}

/**
 * Service class for creating and managing alert triage jobs.
 * Acts as a factory for AlertTriageJob instances.
 */
export class AlertTriageService {
  constructor(
    private readonly esClient: ElasticsearchClient,
    private readonly savedObjectsClient: SavedObjectsClientContract,
    private readonly logger: Logger
  ) {}

  /**
   * Create and execute an alert triage job.
   * This creates a new AlertTriageJob instance and executes it.
   */
  async processAlertTriageJob({
    connectorId,
    alertId,
    jobId,
  }: AlertTriageServiceParams): Promise<AlertTriageResult> {
    const job = new AlertTriageJob({
      connectorId,
      alertId,
      jobId,
      esClient: this.esClient,
      savedObjectsClient: this.savedObjectsClient,
      logger: this.logger,
    });

    return job.execute();
  }

  /**
   * Create an alert triage job instance without executing it.
   * Useful for testing or when you want more control over execution.
   */
  createJob({
    connectorId,
    alertId,
    jobId,
  }: AlertTriageServiceParams): AlertTriageJob {
    return new AlertTriageJob({
      connectorId,
      alertId,
      jobId,
      esClient: this.esClient,
      savedObjectsClient: this.savedObjectsClient,
      logger: this.logger,
    });
  }
}

