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
import { Client, Example, Run } from 'langsmith';
import { EvaluatorT, evaluate } from 'langsmith/evaluation';
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

      const customEvaluator: EvaluatorT = (run: Run, example: Example | undefined) => {
        let error: string | undefined;
        const referenceInsights = example?.outputs?.insights ?? [];
        const actualInsights = run.outputs?.insights ?? [];

        if (referenceInsights.length !== actualInsights.length) {
          // Mismatch in number of insights
          error = `Expected ${referenceInsights.length} insights, but got ${actualInsights.length}`;
        } else {
          for (let i = 0; i < referenceInsights.length; i++) {
            const refGroup = referenceInsights[i];
            const actGroup = actualInsights[i];

            if (refGroup.group !== actGroup.group) {
              // Mismatch in group name
              error = `Mismatch in group name at index ${i}: expected '${refGroup.group}', got '${actGroup.group}'`;
              break;
            }

            if (refGroup.events.length !== actGroup.events.length) {
              // Mismatch in number of events
              error = `Mismatch in number of events for group '${refGroup.group}': expected ${refGroup.events.length}, got ${actGroup.events.length}`;
              break;
            }

            for (let j = 0; j < refGroup.events.length; j++) {
              const refEvent = refGroup.events[j];
              const actEvent = actGroup.events[j];

              if (
                refEvent.id !== actEvent.id ||
                refEvent.value !== actEvent.value ||
                refEvent.endpointId !== actEvent.endpointId
              ) {
                // Mismatch in event
                error = `Mismatch in event at group '${refGroup.group}', index ${j}`;
                break;
              }
            }

            if (error) break;
          }
        }

        return {
          key: 'correct',
          score: error ? 0 : 1,
          comment: error,
        };
      };

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
