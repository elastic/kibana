/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import type { Logger } from '@kbn/core/server';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type { TaskOutput } from '@arizeai/phoenix-client/dist/esm/types/experiments';
import { asyncForEach } from '@kbn/std';

import type { AttackDiscoveryGraphState } from '../../../langchain/graphs';
import { getGraphInputOverrides } from '../helpers/get_graph_input_overrides';
import type { DefaultAttackDiscoveryGraph } from '../../graphs/default_attack_discovery_graph';
import { createPhoenixClient, type PhoenixConfig } from '../../../../routes/evaluate/utils';
import { createAttackDiscoveryStructureEvaluator } from '../helpers/get_custom_evaluator';

/**
 * Runs an evaluation for each graph so they show up separately (resulting in
 * each dataset run grouped by connector)
 */
export const runEvaluations = async ({
  datasetName,
  graphs,
  logger,
  phoenixConfig,
  evaluationId,
}: {
  datasetName: string;
  graphs: Array<{
    connector: Connector;
    graph: DefaultAttackDiscoveryGraph;
    llmType: string | undefined;
    name: string;
    traceOptions: {
      projectName: string | undefined;
      tracers: LangChainTracer[];
    };
  }>;
  logger: Logger;
  phoenixConfig: PhoenixConfig;
  evaluationId: string;
}): Promise<void> => {
  // Create Phoenix client
  const phoenixClient = createPhoenixClient(phoenixConfig);

  await asyncForEach(graphs, async ({ connector, graph, llmType, name, traceOptions }) => {
    const subject = `connector "${connector.name}" (${llmType}), running experiment "${name}"`;

    try {
      logger.info(() => `Evaluating ${subject} with dataset "${datasetName}" using Phoenix`);

      const task = async (example: Example): Promise<TaskOutput> => {
        const { input } = example;
        logger.debug(() => `Raw example Input for ${subject}":\n ${JSON.stringify(input)}`);

        // The example `Input` may have overrides for the initial state of the graph:
        const overrides = getGraphInputOverrides(input);

        const result: AttackDiscoveryGraphState = await graph.invoke(
          {
            ...overrides,
          },
          {
            callbacks: [...(traceOptions.tracers ?? [])],
            runName: name,
            tags: ['evaluation', llmType ?? ''],
          }
        );

        return result as TaskOutput;
      };

      // Run Phoenix experiment
      const experiments = await import('@arizeai/phoenix-client/experiments');

      const evalOutput = await experiments.runExperiment({
        client: phoenixClient,
        dataset: {
          datasetId: datasetName,
        },
        experimentName: `${name} - ${evaluationId}`,
        task,
        experimentMetadata: {
          evaluationId,
          connectorId: connector.id,
          connectorName: connector.name,
          llmType,
          graphType: 'attack-discovery',
        },
        evaluators: [
          // Phoenix-compatible correctness evaluator (inline for backward compatibility)
          {
            name: 'attack_discovery_correctness',
            kind: 'CODE' as const,
            evaluate: ({ output }: { output: unknown }) => {
              // Basic structural validation
              const hasInsights = output && typeof output === 'object' && 'insights' in output;
              const insightsArray = hasInsights
                ? (output as AttackDiscoveryGraphState).insights
                : null;
              const hasValidInsights = insightsArray && insightsArray.length > 0;

              return {
                score: hasValidInsights ? 1 : 0,
                label: hasValidInsights ? 'PASS' : 'FAIL',
                explanation: hasValidInsights
                  ? `Generated ${insightsArray.length} attack discovery insight(s)`
                  : 'No attack discovery insights generated',
              };
            },
          },
          // Domain-specific structural evaluator (validates discovery structure)
          createAttackDiscoveryStructureEvaluator(),
        ],
        logger: {
          error: logger.error.bind(logger),
          info: logger.info.bind(logger),
          log: logger.info.bind(logger),
        },
        concurrency: 5, // prevents rate limiting
      });

      logger.info(() => `Evaluation complete for ${subject}`);

      logger.debug(
        () => `Evaluation output for ${subject}:\n ${JSON.stringify(evalOutput, null, 2)}`
      );
    } catch (e) {
      logger.error(`Error evaluating ${subject}: ${e}`);
    }
  });
};
