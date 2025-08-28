/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { AnonymizationFieldResponse, Replacements } from '@kbn/elastic-assistant-common';
import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from '@kbn/zod';
import type { DateMath } from '@elastic/elasticsearch/lib/api/types';
import type { InferenceChatModel } from '@kbn/inference-langchain';
import { getRetrieveAnonymizedAlertsNode } from '../../../attack_discovery/graphs/default_attack_discovery_graph/nodes/retriever';
import { extractJson } from '../../../langchain/output_chunking/nodes/helpers';
import { SYNTAX } from '../../../prompt/prompts';

export interface GetDefaultAttackDiscoveryGraphParams {
  alertsIndexPattern?: string;
  anonymizationFields: AnonymizationFieldResponse[];
  end?: string;
  esClient: ElasticsearchClient;
  llm: InferenceChatModel;
  logger?: Logger;
  onNewReplacements?: (replacements: Replacements) => void; // TODO: Why this?
  replacements?: Replacements;
  size: number;
  start?: string;
  identifier: string;
  identifierKey: string;
}

export const NodeType = {
  EXPLAIN: 'explain',
  RETRIEVE_ANONYMIZED_DOCS_NODE: 'retrieve_anonymized_docs',
} as const;

const explainRiskNodeSchema = z.object({
  summary: z.string({
    description: `A short (no more than a sentence) summary why the entity is considered risky featuring only the host.name and user.name fields (when they are applicable), using the ${SYNTAX} syntax for host.name and user.name fields`,
  }),

  detailedExplanation: z.string({
    description: `A detailed explanation of the risk summary, including the most recent alerts and their significance, using the ${SYNTAX} syntax for host.name and user.name fields`,
  }),
  recommendations: z.string({
    description: `A summary of why the entity is considered risky, using the ${SYNTAX} syntax for host.name and user.name fields`,
  }),
});

type ExplainRiskNodeSchema = z.infer<typeof explainRiskNodeSchema>;

export const getExplainRiskScoreGraph = ({
  alertsIndexPattern,
  anonymizationFields,
  esClient,
  llm,
  logger,
  onNewReplacements,
  replacements,
  size,
  end,
  start,
  identifier,
  identifierKey,
}: GetDefaultAttackDiscoveryGraphParams) => {
  try {
    const filter = { term: { [identifierKey]: identifier } };

    const keepNewerReducer = <T>(x: T, y?: T) => y ?? x;
    const graphState = Annotation.Root({
      // Initial Parameters
      end: Annotation<DateMath | undefined>({
        reducer: keepNewerReducer,
        default: () => end,
      }),
      start: Annotation<DateMath | undefined, DateMath | undefined>({
        reducer: keepNewerReducer,
        default: () => start,
      }),
      filter: Annotation<Record<string, unknown> | null | undefined>({
        reducer: keepNewerReducer,
        default: () => filter,
      }),
      // Internal State
      anonymizedDocuments: Annotation<Document[]>({
        reducer: keepNewerReducer,
        default: () => [],
      }),
      // Results
      replacements: Annotation<Replacements>({
        reducer: keepNewerReducer,
        default: () => ({}),
      }),
      insight: Annotation<ExplainRiskNodeSchema | null>({
        reducer: keepNewerReducer,
        default: () => null,
      }),
    });

    const retrieveAnonymizedAlertsNode = getRetrieveAnonymizedAlertsNode({
      alertsIndexPattern,
      anonymizationFields,
      esClient,
      logger,
      onNewReplacements,
      replacements,
      size,
    });

    // Define the function that calls the model
    const explainNode = async (state: typeof graphState.State) => {
      const outputParser = StructuredOutputParser.fromZodSchema(explainRiskNodeSchema);
      const formatInstructions = outputParser.getFormatInstructions();

      const prompt = ChatPromptTemplate.fromTemplate(
        `Answer the user's question as best you can:\n{format_instructions}\n{query}`
      );

      logger?.debug(() => `explain node is invoking the chain (${llm._llmType()})`);

      const rawResponse = await prompt.pipe(llm).invoke({
        format_instructions: formatInstructions,
        query: `Your task is to analyze if an entity is risky and why based on the most recent alerts provided. Weight your response to the more recent or highest risk events.
                Use the special {{ field.name fieldValue }} syntax to reference source data fields.
        
                Here are the alerts:
                  ${state.anonymizedDocuments
                    .map((alert) => JSON.stringify(alert))
                    .join('\n\n')}                  
          `,
      });

      // content is a string that contains JSON, we need to strip the quotes and parse it
      return { insight: JSON.parse(extractJson(rawResponse.content)) };
    };

    const explainOrEnd = (state: typeof graphState.State): 'end' | 'explain' => {
      const { anonymizedDocuments } = state;
      return anonymizedDocuments.length === 0 ? 'end' : 'explain';
    };

    const graph = new StateGraph(graphState)
      .addNode(NodeType.RETRIEVE_ANONYMIZED_DOCS_NODE, retrieveAnonymizedAlertsNode)
      .addNode(NodeType.EXPLAIN, explainNode)
      .addEdge(START, NodeType.RETRIEVE_ANONYMIZED_DOCS_NODE)
      .addConditionalEdges(NodeType.RETRIEVE_ANONYMIZED_DOCS_NODE, explainOrEnd, {
        explain: NodeType.EXPLAIN,
        end: END,
      })
      .addEdge(NodeType.EXPLAIN, END);

    return graph.compile();
  } catch (e) {
    throw new Error(`Unable to compile ExplainRiskScore\n${e}`);
  }
};
