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
import { HumanMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';

export interface AlertTriageJobParams {
  alerts: Array<{ alertId: string; alertIndex: string }>;
  jobId: string;
  esClient: ElasticsearchClient;
  savedObjectsClient: SavedObjectsClientContract;
  alertsClient: AlertsClient;
  chatModel: InferenceChatModel;
  request: KibanaRequest;
  logger: Logger;
}

/**
 * Represents a multi-alert triage job.
 * Encapsulates all logic for processing multiple alerts through the triage workflow.
 */
export class AlertTriageJob {
  private readonly chatModel: InferenceChatModel;
  private readonly alerts: Array<{ alertId: string; alertIndex: string }>;
  private readonly jobId: string;
  private readonly esClient: ElasticsearchClient;
  private readonly savedObjectsClient: SavedObjectsClientContract;
  private readonly alertsClient: AlertsClient;
  private readonly request: KibanaRequest;
  private readonly logger: Logger;

  constructor({
    alerts,
    jobId,
    esClient,
    savedObjectsClient,
    alertsClient,
    chatModel,
    request,
    logger,
  }: AlertTriageJobParams) {
    this.chatModel = chatModel;
    this.alerts = alerts;
    this.jobId = jobId;
    this.esClient = esClient;
    this.savedObjectsClient = savedObjectsClient;
    this.alertsClient = alertsClient;
    this.request = request;
    this.logger = logger;
  }

  /**
   * Execute the alert triage job.
   * This orchestrates the complete workflow:
   * 1. Validates the connector
   * 2. Fetches all alerts
   * 3. Analyzes the alerts using LLM
   * 4. Stores the results
   */
  async execute(): Promise<AlertTriageResult> {
    const alertIds = this.alerts.map(a => a.alertId).join(', ');
    this.logger.debug(`Executing alert triage job ${this.jobId} for alerts: ${alertIds}`);

    try {

      const alerts = await this.fetchAlerts(this.alerts);

      const analysis = await this.analyzeWithLLM(alerts);

      await this.storeResults(analysis);

      this.logger.info(`Alert triage job ${this.jobId} completed successfully for ${alerts.length} alerts`);

      return {
        jobId: this.jobId,
        alertId: alertIds,
        success: true,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      this.logger.error(
        `Error executing alert triage job ${this.jobId} for alerts ${alertIds}: ${errorMessage}`,
        errorStack ? { error: errorStack } : { error }
      );

      return {
        jobId: this.jobId,
        alertId: alertIds,
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Fetch all alert details using AlertsClient
   * Batches requests by index to minimize the number of queries
   * @private
   */
  private async fetchAlerts(alerts: { alertId: string; alertIndex: string }[]): Promise<unknown[]> {
    this.logger.debug(`Fetching ${this.alerts.length} alerts`);

    try {
      // Group alerts by index
      const alertsByIndex = new Map<string, string[]>();
      for (const { alertId, alertIndex } of alerts) {
        if (!alertsByIndex.has(alertIndex)) {
          alertsByIndex.set(alertIndex, []);
        }
        alertsByIndex.get(alertIndex)!.push(alertId);
      }

      this.logger.debug(`Batching fetch across ${alertsByIndex.size} index(es)`);

      // Fetch all alerts for each index in parallel
      const fetchPromises = Array.from(alertsByIndex.entries()).map(async ([index, alertIds]) => {
        const response = await this.alertsClient.find({
          index,
          query: {
            bool: {
              filter: [
                {
                  terms: {
                    _id: alertIds,
                  },
                },
              ],
            },
          },
          size: alertIds.length,
        });

        if (!response.hits.hits || response.hits.hits.length === 0) {
          throw new Error(`No alerts found in index ${index} for IDs: ${alertIds.join(', ')}`);
        }

        if (response.hits.hits.length !== alertIds.length) {
          const foundIds = new Set(response.hits.hits.map(hit => hit._id));
          const missingIds = alertIds.filter(id => !foundIds.has(id));
          throw new Error(`Missing alerts in index ${index}: ${missingIds.join(', ')}`);
        }

        this.logger.debug(`Successfully fetched ${response.hits.hits.length} alert(s) from ${index}`);

        return response.hits.hits.map(alert => ({
          ...alert._source,
          _id: alert._id,
          _index: alert._index,
        }));
      });

      const alertArrays = await Promise.all(fetchPromises);
      const fetchedAlerts = alertArrays.flat();
      
      this.logger.debug(`Successfully fetched all ${fetchedAlerts.length} alerts`);
      
      return fetchedAlerts;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Failed to fetch alerts: ${errorMessage}`,
        errorStack ? { error: errorStack } : { error }
      );
      throw error;
    }
  }

  /**
   * Analyze all alerts using LLM connector
   * @private
   */
  private async analyzeWithLLM(alerts: unknown[]): Promise<unknown> {

    const fetchAlertTool = tool(async (input: { alertId: string, index: string }) => {
      const alert = await this.fetchAlerts([{ alertId: input.alertId, alertIndex: input.index }]);
      return JSON.stringify(alert);
    }, {
      name: 'fetch_alert',
      description: 'Fetch an alert from the Elasticsearch index',
      schema: z.object({
        alertId: z.string(),
        index: z.string(),
      }),
    });

    const agent = createDeepAgent({
      systemPrompt: "You are an expert security analyst.",
      model: this.chatModel,
      tools: [
        fetchAlertTool
      ],
      subagents: [
        {
          name: 'individual_alert_triage',
          description: `Triage an individual alert.`,
          systemPrompt: ALERT_TRIAGE_PROMPT,
        }
      ]
    });

    // Build files object with all alerts
    
    const alertFiles = alerts.reduce((acc: Record<string, { content: string[]; created_at: string; modified_at: string }>, alert: any) => {
      const alertId = alert._id;
      const filename = `/alerts/${alertId}.json`;
      acc[filename] = {
        content: [JSON.stringify(alert, null, 2)],
        created_at: new Date().toISOString(),
        modified_at: new Date().toISOString(),
      };
      return acc;
    }, {});

    const result = await agent.invoke({
      messages: [
        new HumanMessage(`Triage the following alerts ${JSON.stringify(this.alerts)}`),
      ],
      files: {}
    }, {
      recursionLimit: 100
    });
    
    const messages = result.messages as BaseMessage[];
    const lastMessage = messages[messages.length - 1];

    const modelWithStructuredOutput = this.chatModel.withStructuredOutput(
      z.object({
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
    )

    modelWithStructuredOutput.invoke([
      new SystemMessage("Format the result as a JSON object"),
      new HumanMessage(lastMessage.content as string)
    ])

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


