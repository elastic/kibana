/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger } from '@kbn/logging';
import { asyncForEach } from '@kbn/std';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas';
import { DefendInsightsCombinedPrompts } from '../graphs/default_defend_insights_graph/prompts/incompatible_antivirus';
import { runDefendInsightsEvaluations } from './run_evaluations';
import { DEFAULT_EVAL_ANONYMIZATION_FIELDS } from '../../attack_discovery/evaluation/constants';
import { DefaultDefendInsightsGraph } from '../graphs/default_defend_insights_graph';
import { DefendInsightsGraphMetadata } from '../../langchain/graphs';
import { getLlmType } from '../../../routes/utils';
import { createOrUpdateEvaluationResults, EvaluationStatus } from '../../../routes/evaluate/utils';

interface ConnectorWithPrompts extends Connector {
  prompts: DefendInsightsCombinedPrompts;
}

export const evaluateDefendInsights = async ({
  actionsClient,
  defendInsightsGraphs,
  anonymizationFields = DEFAULT_EVAL_ANONYMIZATION_FIELDS, // determines which fields are included in the alerts
  connectors,
  connectorTimeout,
  datasetName,
  esClient,
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
  connectors: ConnectorWithPrompts[];
  connectorTimeout: number;
  datasetName: string;
  esClient: ElasticsearchClient;
  esClientInternalUser: ElasticsearchClient;
  evaluationId: string;
  evaluatorConnectorId: string | undefined;
  langSmithApiKey: string | undefined;
  langSmithProject: string | undefined;
  logger: Logger;
  runName: string;
  size: number;
}): Promise<void> => {
  await asyncForEach(defendInsightsGraphs, async ({ getDefaultDefendInsightsGraph }) => {
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
    }> = connectors.map((connector) => {
      const llmType = getLlmType(connector.actionTypeId);

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
        insightType: DefendInsightType.Enum.incompatible_antivirus, // TODO: parameterize
        endpointIds: [], // Empty endpointIds, because we are seeding the graph with the dataset
        esClient,
        llm,
        logger,
        size,
        anonymizationFields,
        prompts: connector.prompts,
      });

      return {
        connector,
        graph,
        llmType,
        name: `${runName} - ${connector.name} - ${evaluationId} - Defend Insights`,
        traceOptions,
      };
    });

    // run the evaluations for each graph:
    await runDefendInsightsEvaluations({
      insightType: DefendInsightType.Enum.incompatible_antivirus,
      evaluatorConnectorId,
      datasetName,
      graphs,
      langSmithApiKey,
      logger,
    });
  });

  await createOrUpdateEvaluationResults({
    evaluationResults: [{ id: evaluationId, status: EvaluationStatus.COMPLETE }],
    esClientInternalUser,
    logger,
  });
};
