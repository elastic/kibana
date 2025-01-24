/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { Logger, SavedObjectsClientContract } from '@kbn/core/server';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { ActionsClientLlm } from '@kbn/langchain/server';
import { getLangSmithTracer } from '@kbn/langchain/server/tracers/langsmith';
import { asyncForEach } from '@kbn/std';
import { PublicMethodsOf } from '@kbn/utility-types';

import { getPrompt, promptDictionary } from '../../prompt';
import { DEFAULT_EVAL_ANONYMIZATION_FIELDS } from './constants';
import { AttackDiscoveryGraphMetadata } from '../../langchain/graphs';
import { DefaultAttackDiscoveryGraph } from '../graphs/default_attack_discovery_graph';
import { getLlmType } from '../../../routes/utils';
import { runEvaluations } from './run_evaluations';

export const evaluateAttackDiscovery = async ({
  actionsClient,
  attackDiscoveryGraphs,
  alertsIndexPattern,
  anonymizationFields = DEFAULT_EVAL_ANONYMIZATION_FIELDS, // determines which fields are included in the alerts
  connectors,
  connectorTimeout,
  datasetName,
  esClient,
  evaluationId,
  evaluatorConnectorId,
  langSmithApiKey,
  langSmithProject,
  logger,
  runName,
  savedObjectsClient,
  size,
}: {
  actionsClient: PublicMethodsOf<ActionsClient>;
  attackDiscoveryGraphs: AttackDiscoveryGraphMetadata[];
  alertsIndexPattern: string;
  anonymizationFields?: AnonymizationFieldResponse[];
  connectors: Connector[];
  connectorTimeout: number;
  datasetName: string;
  esClient: ElasticsearchClient;
  evaluationId: string;
  evaluatorConnectorId: string | undefined;
  langSmithApiKey: string | undefined;
  langSmithProject: string | undefined;
  logger: Logger;
  runName: string;
  savedObjectsClient: SavedObjectsClientContract;
  size: number;
}): Promise<void> => {
  await asyncForEach(attackDiscoveryGraphs, async ({ getDefaultAttackDiscoveryGraph }) => {
    // create a graph for every connector:
    const graphs: Array<{
      connector: Connector;
      graph: DefaultAttackDiscoveryGraph;
      llmType: string | undefined;
      name: string;
      traceOptions: {
        projectName: string | undefined;
        tracers: LangChainTracer[];
      };
    }> = await Promise.all(
      connectors.map(async (connector) => {
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
          temperature: 0, // zero temperature for attack discovery, because we want structured JSON output
          timeout: connectorTimeout,
          traceOptions,
        });

        const defaultPrompt = await getPrompt({
          actionsClient,
          connector,
          connectorId: connector.id,
          promptId: promptDictionary.attackDiscoveryDefault,
          savedObjectsClient,
        });

        const refinePrompt = await getPrompt({
          actionsClient,
          connector,
          connectorId: connector.id,
          promptId: promptDictionary.attackDiscoveryRefine,
          savedObjectsClient,
        });

        const continuePrompt = await getPrompt({
          actionsClient,
          connector,
          connectorId: connector.id,
          promptId: promptDictionary.attackDiscoveryContinue,
          savedObjectsClient,
        });

        const graph = getDefaultAttackDiscoveryGraph({
          alertsIndexPattern,
          anonymizationFields,
          esClient,
          llm,
          logger,
          prompts: {
            continue: continuePrompt,
            default: defaultPrompt,
            refine: refinePrompt,
          },
          size,
        });

        return {
          connector,
          graph,
          llmType,
          name: `${runName} - ${connector.name} - ${evaluationId} - Attack discovery`,
          traceOptions,
        };
      })
    );

    // run the evaluations for each graph:
    await runEvaluations({
      actionsClient,
      connectorTimeout,
      evaluatorConnectorId,
      datasetName,
      graphs,
      langSmithApiKey,
      logger,
    });
  });
};
