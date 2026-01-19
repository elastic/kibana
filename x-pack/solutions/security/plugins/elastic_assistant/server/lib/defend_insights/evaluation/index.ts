/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { Logger } from '@kbn/logging';
import type { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ActionsClientLlm } from '@kbn/langchain/server';

import type { DefendInsightsGraphMetadata } from '../../langchain/graphs';
import type { DefaultDefendInsightsGraph } from '../graphs/default_defend_insights_graph';
import type { AIAssistantKnowledgeBaseDataClient } from '../../../ai_assistant_data_clients/knowledge_base';
import { createOrUpdateEvaluationResults, EvaluationStatus } from '../../../routes/evaluate/utils';
import { getLlmType } from '../../../routes/utils';
import { DEFAULT_EVAL_ANONYMIZATION_FIELDS } from '../../attack_discovery/evaluation/constants';
import { getDefendInsightsPrompt } from '../graphs/default_defend_insights_graph/prompts';
import { runDefendInsightsEvaluations } from './run_evaluations';

export const evaluateDefendInsights = async ({
  actionsClient,
  defendInsightsGraphs,
  anonymizationFields = DEFAULT_EVAL_ANONYMIZATION_FIELDS, // determines which fields are included in the alerts
  connectors,
  connectorTimeout,
  datasetName,
  esClient,
  soClient,
  kbDataClient,
  esClientInternalUser,
  evaluationId,
  evaluatorConnectorId,
  langSmithApiKey,
  langSmithProject,
  logger,
  runName,
  size,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  defendInsightsGraphs: DefendInsightsGraphMetadata[];
  anonymizationFields?: AnonymizationFieldResponse[];
  connectors: Connector[];
  connectorTimeout: number;
  datasetName: string;
  esClient: ElasticsearchClient;
  soClient: SavedObjectsClientContract;
  kbDataClient?: AIAssistantKnowledgeBaseDataClient;
  esClientInternalUser: ElasticsearchClient;
  evaluationId: string;
  evaluatorConnectorId: string | undefined;
  langSmithApiKey: string | undefined;
  langSmithProject: string | undefined;
  logger: Logger;
  runName: string;
  size: number;
}): Promise<void> => {
  await asyncForEach(
    defendInsightsGraphs,
    async ({ getDefaultDefendInsightsGraph, insightType }) => {
      // create a graph for every connector:
      const graphs: Array<{
        connector: Connector;
        graph: DefaultDefendInsightsGraph;
        llmType: string | undefined;
        name: string;
        traceOptions: {
          projectName: string | undefined;
          tracers: LangChainTracer[];
        };
      }> = await Promise.all(
        connectors.map(async (connector) => {
          const llmType = getLlmType(connector.actionTypeId);
          const prompts = await getDefendInsightsPrompt({
            type: insightType,
            actionsClient,
            connectorId: connector.id,
            connector,
            savedObjectsClient: soClient,
          });

          const traceOptions = {
            projectName: langSmithProject,
            tracers: [
              ...getLangSmithTracer({
                apiKey: langSmithApiKey,
                projectName: langSmithProject,
                logger,
              }),
            ],
          };

          const llm = new ActionsClientLlm({
            actionsClient,
            connectorId: connector.id,
            llmType,
            logger,
            temperature: 0, // zero temperature for defend insights, because we want structured JSON output
            timeout: connectorTimeout,
            traceOptions,
            model: connector.config?.defaultModel,
          });

          const graph = getDefaultDefendInsightsGraph({
            insightType,
            endpointIds: [], // Empty endpointIds, because we are seeding the graph with the dataset
            esClient,
            kbDataClient: kbDataClient || null,
            llm,
            logger,
            size,
            anonymizationFields,
            prompts,
          });

          return {
            connector,
            graph,
            llmType,
            name: `${runName} - ${connector.name} - ${evaluationId} - Defend Insights`,
            traceOptions,
          };
        })
      );

      // run the evaluations for each graph:
      await runDefendInsightsEvaluations({
        insightType,
        evaluatorConnectorId,
        datasetName,
        graphs,
        langSmithApiKey,
        logger,
      });
    }
  );

  await createOrUpdateEvaluationResults({
    evaluationResults: [{ id: evaluationId, status: EvaluationStatus.COMPLETE }],
    esClientInternalUser,
    logger,
  });
};
