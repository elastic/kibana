/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import type { ActionsPluginStart } from '@kbn/actions-plugin/server';

import {
  aiInvestigationStepCommonDefinition,
  type AiInvestigationStepInput,
  type AiInvestigationStepOutput,
} from '../../../common/workflows/steps/ai_investigation';
import { executeInvestigation } from '../../lib/alert_investigation';
import { getLlmClient } from '../../lib/alert_investigation/helpers';
import type { ConfigSchema } from '../../config_schema';

/**
 * AI Investigation Workflow Step Definition
 *
 * Wraps LangGraph multi-agent investigation as a single workflow step
 *
 * This allows the investigation to be:
 * - Triggered by workflow events (alert.created)
 * - Configured via Workflows UI
 * - Reused across multiple workflows
 */
export const createAiInvestigationStepDefinition = ({
  getActionsClient,
  config,
  logger,
}: {
  getActionsClient: (request: KibanaRequest) => Promise<ActionsPluginStart['getActionsClientWithRequest']>;
  config: ConfigSchema;
  logger: Logger;
}) =>
  createServerStepDefinition({
    ...aiInvestigationStepCommonDefinition,

    handler: async (input: AiInvestigationStepInput, context): Promise<AiInvestigationStepOutput> => {
      const { alert_id, alert_index, connector_id, case_id, enabled_agents } = input;

      logger.info(
        `[AI Investigation Step] Starting investigation for alert ${alert_id}${case_id ? ` (case: ${case_id})` : ''}`
      );

      // Check if feature is enabled
      if (!config.llmInvestigationEnabled) {
        throw new Error(
          'LLM-powered investigation is not enabled. Set xpack.elasticAssistant.llmInvestigationEnabled: true in kibana.yml'
        );
      }

      try {
        // Get ES client from workflow context
        const esClient = context.esClient;

        // Fetch the alert
        const alertResponse = await esClient.get({
          index: alert_index,
          id: alert_id,
        });

        if (!alertResponse.found) {
          throw new Error(`Alert ${alert_id} not found in index ${alert_index}`);
        }

        const alert = {
          _id: alertResponse._id,
          _index: alertResponse._index,
          _source: alertResponse._source,
        };

        // Get actions client
        const getActionsClientWithRequest = await getActionsClient(context.request);
        const actionsClient = await getActionsClientWithRequest(context.request);

        // Get LLM client
        const llmClient = await getLlmClient({
          actionsClient,
          connectorId: connector_id,
          connectorTimeout: config.responseTimeout,
          langSmithApiKey: process.env.LANGSMITH_API_KEY,
          logger,
        });

        // Execute LangGraph investigation
        // Note: enabled_agents config would be used here to enable/disable specific agents
        // For foundation spike (2 agents), we ignore this config
        // For production (5 agents), we'd conditionally add nodes based on enabled_agents
        logger.info(`[AI Investigation Step] Executing LangGraph investigation...`);

        const investigation = await executeInvestigation({
          alert,
          caseId: case_id,
          llmClient,
          esClient,
          logger,
        });

        logger.info(
          `[AI Investigation Step] Completed in ${investigation.latencyMs}ms - ${investigation.triage?.classification}`
        );

        // Transform to workflow output format (snake_case for YAML)
        const output: AiInvestigationStepOutput = {
          alert_id: investigation.alertId,
          case_id: investigation.caseId,
          timestamp: investigation.timestamp,
          triage: investigation.triage
            ? {
                classification: investigation.triage.classification,
                attack_type: investigation.triage.attackType,
                confidence: investigation.triage.confidence,
                reasoning: investigation.triage.reasoning,
                similar_alerts_count: investigation.triage.similarAlertsCount,
              }
            : undefined,
          mitre_mapping: investigation.mitreMapping
            ? {
                techniques: investigation.mitreMapping.techniques,
                tactics: investigation.mitreMapping.tactics,
                phase: investigation.mitreMapping.phase,
                confidence: investigation.mitreMapping.confidence,
                reasoning: investigation.mitreMapping.reasoning,
              }
            : undefined,
          investigation_text: investigation.investigationText,
          latency_ms: investigation.latencyMs,
        };

        return output;
      } catch (error) {
        logger.error(`[AI Investigation Step] Failed: ${error.message}`);
        throw error;
      }
    },
  });
