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
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { AlertTriageResult } from '../../types/alert_triage';
import { createDeepAgent } from '@kbn/securitysolution-deep-agent';
import { InferenceChatModel } from '@kbn/inference-langchain';
import { ALERT_TRIAGE_PROMPT } from './prompt';
import z from 'zod/v3';
import { HumanMessage} from '@langchain/core/messages';

export interface AlertTriageJobParams {
  alertId: string;
  jobId: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  alertsClient: AlertsClient;
  alertsIndex: string;
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
  private readonly alertsClient: AlertsClient;
  private readonly alertsIndex: string;
  private readonly request: KibanaRequest;
  private readonly logger: Logger;

  constructor({
    alertId,
    jobId,
    esClient,
    savedObjectsClient,
    alertsClient,
    alertsIndex,
    chatModel,
    request,
    logger,
  }: AlertTriageJobParams) {
    this.chatModel = chatModel;
    this.alertId = alertId;
    this.jobId = jobId;
    this.esClient = esClient;
    this.savedObjectsClient = savedObjectsClient;
    this.alertsClient = alertsClient;
    this.alertsIndex = alertsIndex;
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

      const alert = await this.fetchAlert();

      const analysis = await this.analyzeWithLLM(alert);

      await this.storeResults(analysis);

      this.logger.info(`Alert triage job ${this.jobId} completed successfully`);

      return {
        jobId: this.jobId,
        alertId: this.alertId,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Error executing alert triage job ${this.jobId} for alert ${this.alertId}: ${errorMessage}`,
        errorStack ? { error: errorStack } : { error }
      );

      return {
        jobId: this.jobId,
        alertId: this.alertId,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch alert details using AlertsClient
   * @private
   */
  private async fetchAlert(): Promise<unknown> {
    this.logger.debug(`Fetching alert ${this.alertId}`);

    try {
      const response = await this.alertsClient.find({
        index: this.alertsIndex,
        query: {
          bool: {
            filter: [
              {
                term: {
                  _id: this.alertId,
                },
              },
            ],
          },
        },
        size: 1,
      });

      if (!response.hits.hits || response.hits.hits.length === 0) {
        throw new Error(`Alert with ID ${this.alertId} not found`);
      }

      const alert = response.hits.hits[0];
      this.logger.debug(`Successfully fetched alert ${this.alertId}`);

      return {
        ...alert._source,
        _id: alert._id,
        _index: alert._index,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch alert ${this.alertId}: ${errorMessage}`,
        errorStack ? { error: errorStack } : { error }
      );
      throw error;
    }
  }

  /**
   * Analyze alert using LLM connector
   * @private
   */
  private async analyzeWithLLM(alert: unknown): Promise<unknown> {
    this.logger.debug(`Analyzing alert ${this.alertId}`);


    const agent = createDeepAgent({
      systemPrompt: ALERT_TRIAGE_PROMPT,
      model: this.chatModel,
      responseFormat: z.object({
        summary: z.string().describe('2-3 sentences: event and rule trigger'),
        verdict: z.enum(['Malicious', 'Suspicious', 'Benign']).describe('Verdict of the alert'),
        detailed_justification: z.string().describe('gate applied, evidence summary, assumption notes, MCFs if Suspicious'),
        evidence: z.array(z.string()).describe('each <=18 words, quoting literal fields'),
        recommendations: z.string().describe('single string, lines separated by "\n", each starts with "- "'),
        confidence_score: z.number().describe('float [0,1]'),
        calculated_score: z.number().describe('int [0,100], within verdict band'),
        score_rationale: z.string().describe('one line, format specified in scoring_and_confidence'),
        reasoning_records: z.array(z.string()).describe('factual analysis only: event summary, baseline, anchors, anomalies, MCFs, hypothesis weighing; no meta about scoring mechanics, prompt rules, or formatting')
      })
    });

    const result = await agent.invoke({
      messages: [
        new HumanMessage("Analyse the alert stored at /alert.json"),
      ],
      files: {
        "/alert.json": {
          content: [JSON.stringify(alert, null, 2)],
          created_at: new Date().toISOString(),
          modified_at: new Date().toISOString(),
        },
      }
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


