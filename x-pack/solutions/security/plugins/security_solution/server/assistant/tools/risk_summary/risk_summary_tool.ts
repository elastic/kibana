/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import type { AssistantTool, AssistantToolParams } from '@kbn/elastic-assistant-plugin/server';
import { LLMChain } from 'langchain/chains';
import { OutputFixingParser, StructuredOutputParser } from 'langchain/output_parsers';
import { DynamicTool } from '@langchain/core/tools';
import { z } from '@kbn/zod';
import { APP_UI_ID } from '../../../../common';

export interface RiskSummaryToolParams extends AssistantToolParams {
  entitiesIndexPattern: string;
  size: number;
  promptTemplate?: string;
}

export interface RiskSummaryToolResponse extends RiskSummaryOutput {
  summary: string;
  detailedExplanation: string;
  recommendations: string;
}

export const RISK_SUMMARY_TOOL_DESCRIPTION =
  'Call this tool to explain the risk score of an entity.';

const schema = z.object({
  summary: z.string().describe('A summary of why the entity is considered risky.'),
  detailedExplanation: z
    .string()
    .describe(
      'A detailed explanation of the risk summary, including the most recent alerts and their significance.'
    ),
  recommendations: z
    .string()
    .describe(
      'Recommendations for mitigating the risks associated with the entity, based on the alerts.'
    ),
});

export type RiskSummaryOutput = z.infer<typeof schema>;

export const getRiskSummaryOutputParser = () => StructuredOutputParser.fromZodSchema(schema);

const PROMPT_TEMPLATE =
  ChatPromptTemplate.fromTemplate(`You are a helpful cybersecurity (SIEM) expert agent.
Your task is to analyze if an entity is risky and why based on the most recent alerts provided. Weight your response to the more recent or highest risk events.
Here are the alerts:
{mostRecentAlerts}
`);

/**
 * Returns a tool that resolves entities for a given search entity.
 */
export const RISK_SUMMARY_TOOL: AssistantTool = {
  id: 'risk-summary',
  name: 'RiskSummaryTool',
  description: RISK_SUMMARY_TOOL_DESCRIPTION,
  sourceRegister: APP_UI_ID,
  isSupported: (params: AssistantToolParams): params is RiskSummaryToolParams => {
    const { llm } = params;

    return llm != null;
  },
  getTool(params: AssistantToolParams) {
    if (!this.isSupported(params)) return null;

    const { langChainTimeout, llm, logger, mostRecentAlerts } = params as RiskSummaryToolParams;

    return new DynamicTool({
      name: 'RiskSummaryTool',
      description: RISK_SUMMARY_TOOL_DESCRIPTION,
      func: async () => {
        if (llm == null) {
          throw new Error('LLM is required for risk summary');
        }

        if (!mostRecentAlerts || mostRecentAlerts.length === 0) {
          throw new Error('No alerts provided for risk summary');
        }

        const outputParser = getRiskSummaryOutputParser();
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

        const query = await PROMPT_TEMPLATE.format({
          mostRecentAlerts: mostRecentAlerts.map((alert) => JSON.stringify(alert)).join('\n\n'),
        });

        logger.info(`Risk summary LLM prompt: ${query}`);

        if (!llm) {
          throw new Error('LLM is required for risk summary');
        }

        const { result } = await answerFormattingChain.call({
          query,
          timeout: langChainTimeout,
        });

        logger.info(`Risk summary LLM took ${new Date().getTime() - llmStart}ms`);
        logger.info(`Risk summary LLM raw output: ${JSON.stringify(result)}`);

        const toolResponse: RiskSummaryToolResponse = {
          summary: result.summary,
          detailedExplanation: result.detailedExplanation,
          recommendations: result.recommendations,
        };

        logger.info(`Risk summary tool response: ${JSON.stringify(toolResponse)}`);

        return JSON.stringify(toolResponse, null, 2);
      },
      tags: ['entity-analytics', 'entity-resolution'],
    });
  },
};
