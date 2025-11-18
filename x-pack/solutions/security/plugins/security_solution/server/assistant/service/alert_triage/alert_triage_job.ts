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
  KibanaRequest,
} from '@kbn/core/server';
import type { AlertTriageResult } from '../../types/alert_triage';
import { createDeepAgent } from '@kbn/securitysolution-deep-agent';
import { InferenceChatModel } from '@kbn/inference-langchain';

export interface AlertTriageJobParams {
  alertId: string;
  jobId: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  chatModel: InferenceChatModel;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Represents a single alert triage job.
 * Encapsulates all logic for processing one alert through the triage workflow.
 */
export class AlertTriageJob {
  private readonly chatModel: InferenceChatModel;
  private readonly alertId: string;
  private readonly jobId: string;
  private readonly esClient: ElasticsearchClient;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly request: KibanaRequest;
  private readonly logger: Logger;

  constructor({
    alertId,
    jobId,
    esClient,
    savedObjectsClient,
    chatModel,
    request,
    logger,
  }: AlertTriageJobParams) {
    this.chatModel = chatModel;
    this.alertId = alertId;
    this.jobId = jobId;
    this.esClient = esClient;
    this.savedObjectsClient = savedObjectsClient;
    this.request = request;
    this.logger = logger;
  }

  /**
   * Execute the alert triage job.
   * This orchestrates the complete workflow:
   * 1. Validates the connector
   * 2. Fetches the alert
   * 3. Analyzes the alert using LLM
   * 4. Stores the results
   */
  async execute(): Promise<AlertTriageResult> {
    this.logger.debug(`Executing alert triage job ${this.jobId} for alert ${this.alertId}`);

    try {

      // Step 2: Fetch alert
      const alert = await this.fetchAlert();

      // Step 3: Analyze alert with LLM
      const analysis = await this.analyzeWithLLM(alert);

      // Step 4: Store results
      await this.storeResults(analysis);

      this.logger.info(`Alert triage job ${this.jobId} completed successfully`);

      return {
        jobId: this.jobId,
        alertId: this.alertId,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Error executing alert triage job ${this.jobId} for alert ${this.alertId}:`,
        error
      );

      return {
        jobId: this.jobId,
        alertId: this.alertId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch alert details from Elasticsearch
   * @private
   */
  private async fetchAlert(): Promise<unknown> {
    // TODO: Implement alert fetching
    // - Query Elasticsearch for the alert by ID
    // - Ensure alert exists and is accessible
    // - Return alert document with all necessary fields
    this.logger.debug(`Fetching alert ${this.alertId}`);
    return {};
  }

  /**
   * Analyze alert using LLM connector
   * @private
   */
  private async analyzeWithLLM(alert: unknown): Promise<unknown> {
    this.logger.debug(`Analyzing alert ${this.alertId}`);

    const agent = createDeepAgent({
      systemPrompt: 'You are a security assistant that helps triage alerts.',
      model: this.chatModel,
    });

    const result = await agent.invoke({
      messages: [{ role: 'user', content: 'What is 10 + 10' }],
    });

    return {};
  }

  /**
   * Store triage results in Elasticsearch
   * @private
   */
  private async storeResults(analysis: unknown): Promise<void> {
    // TODO: Implement result storage
    // - Create triage result document
    // - Index to Elasticsearch
    // - Update alert with triage metadata
    // - Log completion event
    this.logger.debug(`Storing triage results for job ${this.jobId}`);
  }
}


