/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Connector } from '@kbn/actions-plugin/server/application/connector/types';
import { Logger } from '@kbn/logging';
import { asyncForEach } from '@kbn/std';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Client } from 'langsmith';
import { evaluate } from 'langsmith/evaluation';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import { getDefendInsightsCustomEvaluator } from '../helpers/get_custom_evaluator';
import { getDefendInsightsGraphInputOverrides } from '../helpers/get_graph_input_overrides';
import { DefaultDefendInsightsGraph } from '../../graphs/default_defend_insights_graph';

/**
 * Runs an evaluation for each graph so they show up separately (resulting in
 * each dataset run grouped by connector)
 */
export const runDefendInsightsEvaluations = async ({
  evaluatorConnectorId,
  datasetName,
  graphs,
  langSmithApiKey,
  logger,
  insightType,
}: {
  evaluatorConnectorId: string | undefined;
  datasetName: string;
  graphs: Array<{
    connector: Connector;
    graph: DefaultDefendInsightsGraph;
    llmType: string | undefined;
    name: string;
    traceOptions: {
      projectName: string | undefined;
      tracers: LangChainTracer[];
    };
  }>;
  langSmithApiKey: string | undefined;
  logger: Logger;
  insightType: DefendInsightType;
}): Promise<void> =>
  asyncForEach(graphs, async ({ connector, graph, llmType, name, traceOptions }) => {
    const subject = `connector "${connector.name}" (${llmType}), running experiment "${name}"`;

    try {
      logger.info(
        () =>
          `Evaluating ${subject} with dataset "${datasetName}" and evaluator "${evaluatorConnectorId}"`
      );

      const predict = async (input: unknown) => {
        logger.debug(() => `Raw example Input for ${subject}":\n ${input}`);

        // The example `Input` may have overrides for the initial state of the graph:
        const overrides = getDefendInsightsGraphInputOverrides(input);

        return graph.invoke(
          {
            ...overrides,
          },
          {
            callbacks: [...(traceOptions.tracers ?? [])],
            runName: name,
            tags: ['evaluation', llmType ?? ''],
          }
        );
      };

      const customEvaluator = getDefendInsightsCustomEvaluator({ insightType });

      const evalOutput = await evaluate(predict, {
        client: new Client({ apiKey: langSmithApiKey }),
        data: datasetName ?? '',
        evaluators: [customEvaluator],
        experimentPrefix: name,
        maxConcurrency: 5, // prevents rate limiting
      });

      logger.info(() => `Evaluation complete for ${subject}`);

      logger.debug(
        () => `Evaluation output for ${subject}:\n ${JSON.stringify(evalOutput, null, 2)}`
      );
    } catch (e) {
      logger.error(`Error evaluating ${subject}: ${e}`);
    }
  });
