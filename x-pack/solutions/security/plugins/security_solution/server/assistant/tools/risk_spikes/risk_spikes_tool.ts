/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PromptTemplate } from '@langchain/core/prompts';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { LLMChain } from 'langchain/chains';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { DynamicTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import type { Alert } from '@kbn/alerts-as-data-utils/src/schemas';
import { APP_UI_ID } from '../../../../common';

export interface RiskSpikesToolParams extends AssistantToolParams {
  entitiesIndexPattern: string;
  size: number;
  promptTemplate?: string;
}

export interface RiskSpikesToolResponse extends RiskSpikesOutput {
  summary: string;
  detailedExplanation: string;
  recommendations: string;
}

export const RISK_SPIKES_TOOL_DESCRIPTION =
  'Call this tool to find matching entities in the entity store for the given search entity.';

const schema = z.object({
  summary: z
    .string()
    .describe(
      'A summary of why the entity is considered risky and what the risk score spike means.'
    ),
  detailedExplanation: z
    .string()
    .describe(
      'A detailed explanation of the risk spikes, including the most recent alerts and their significance.'
    ),
  recommendations: z
    .string()
    .describe(
      'Recommendations for mitigating the risks associated with the entity, based on the alerts and risk score spikes.'
    ),
});

export type RiskSpikesOutput = z.infer<typeof schema>;

export const getRiskSpikesOutputParser = () => StructuredOutputParser.fromZodSchema(schema);

export const getRiskSpikesPrompt = ({ mostRecentAlerts }: { mostRecentAlerts: Alert[] }) =>
  `Your role is to analyze why an entity has recently become more risky based on the alerts provided, the alerts are most recent alerts. Weight your response to the more recent or highest risk events.
  Focus on explaining why the entity is considered risky and what the risk score spike means.
  
  Here are the alerts:
  
  ${mostRecentAlerts.map((alert) => JSON.stringify(alert)).join('\n\n')}
  `;

/**
 * Returns a tool that resolves entities for a given search entity.
 */
export const RISK_SPIKES_TOOL: AssistantTool = {
  id: 'risk-spikes',
  name: 'RiskSpikesTool',
  description: RISK_SPIKES_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is RiskSpikesToolParams => {
    const { llm } = params;

    return llm != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { langChainTimeout, llm, logger, mostRecentAlerts } = params as RiskSpikesToolParams;

    return new DynamicTool({
      name: 'RiskSpikesTool',
      description: RISK_SPIKES_TOOL_DESCRIPTION,
      func: async () => {
        if (llm == null) {
          throw new Error('LLM is required for risk spikes');
        }

        const outputParser = getRiskSpikesOutputParser();
        const outputFixingParser = OutputFixingParser.fromLLM(llm, outputParser);

        const prompt = new PromptTemplate({
          template: `Answer the user's question as best you can:\n{format_instructions}\n{query}`,
          inputVariables: ['query'],
          partialVariables: {
            format_instructions: outputFixingParser.getFormatInstructions(),
          },
        });

        const answerFormattingChain = new LLMChain({
          llm,
          prompt,
          outputKey: 'result',
          outputParser: outputFixingParser,
        });

        const llmStart = new Date().getTime();

        const query = getRiskSpikesPrompt({
          mostRecentAlerts,
        });

        logger.debug(`Risk spikes LLM prompt: ${query}`);

        if (!llm) {
          throw new Error('LLM is required for risk spikes');
        }

        const { result } = await answerFormattingChain.call({
          query,
          timeout: langChainTimeout,
        });

        logger.info(`Risk spikes LLM took ${new Date().getTime() - llmStart}ms`);
        logger.info(`Risk spikes LLM raw output: ${JSON.stringify(result)}`);

        const toolResponse: RiskSpikesToolResponse = {
          summary: result.summary,
          detailedExplanation: result.detailedExplanation,
          recommendations: result.recommendations,
        };

        logger.info(`Risk spikes tool response: ${JSON.stringify(toolResponse)}`);

        return JSON.stringify(toolResponse, null, 2);
      },
      tags: ['entity-analytics', 'entity-resolution'],
    });
  },
};
