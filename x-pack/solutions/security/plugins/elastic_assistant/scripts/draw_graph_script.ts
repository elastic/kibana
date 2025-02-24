/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs/promises';
import path from 'path';
import {
  ActionsClientChatOpenAI,
  type ActionsClientLlm,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import type { Logger } from '@kbn/logging';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { FakeLLM } from '@langchain/core/utils/testing';
import { createOpenAIFunctionsAgent } from 'langchain/agents';
import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_INSIGHTS,
  ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
  ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
  ATTACK_DISCOVERY_GENERATION_TITLE,
  ATTACK_DISCOVERY_CONTINUE,
  ATTACK_DISCOVERY_DEFAULT,
  ATTACK_DISCOVERY_REFINE,
} from '../server/lib/prompt/prompts';
import { getDefaultAssistantGraph } from '../server/lib/langchain/graphs/default_assistant_graph/graph';
import { getDefaultAttackDiscoveryGraph } from '../server/lib/attack_discovery/graphs/default_attack_discovery_graph';

interface Drawable {
  drawMermaidPng: () => Promise<Blob>;
}

// Just defining some test variables to get the graph to compile..
const testPrompt = ChatPromptTemplate.fromMessages([
  ['system', 'You are a helpful assistant'],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

const mockLlm = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const createLlmInstance = () => {
  return mockLlm;
};

async function getAssistantGraph(logger: Logger): Promise<Drawable> {
  const agentRunnable = await createOpenAIFunctionsAgent({
    llm: mockLlm,
    tools: [],
    prompt: testPrompt,
    streamRunnable: false,
  });
  const graph = getDefaultAssistantGraph({
    actionsClient: actionsClientMock.create(),
    agentRunnable,
    logger,
    createLlmInstance,
    tools: [],
    replacements: {},
    contentReferencesEnabled: false,
    savedObjectsClient: savedObjectsClientMock.create(),
  });
  return graph.getGraph();
}

async function getAttackDiscoveryGraph(logger: Logger): Promise<Drawable> {
  const mockEsClient = {} as unknown as ElasticsearchClient;

  const graph = getDefaultAttackDiscoveryGraph({
    anonymizationFields: [],
    esClient: mockEsClient,
    llm: mockLlm as unknown as ActionsClientLlm,
    logger,
    replacements: {},
    prompts: {
      default: ATTACK_DISCOVERY_DEFAULT,
      refine: ATTACK_DISCOVERY_REFINE,
      continue: ATTACK_DISCOVERY_CONTINUE,
      detailsMarkdown: ATTACK_DISCOVERY_GENERATION_DETAILS_MARKDOWN,
      entitySummaryMarkdown: ATTACK_DISCOVERY_GENERATION_ENTITY_SUMMARY_MARKDOWN,
      mitreAttackTactics: ATTACK_DISCOVERY_GENERATION_MITRE_ATTACK_TACTICS,
      summaryMarkdown: ATTACK_DISCOVERY_GENERATION_SUMMARY_MARKDOWN,
      title: ATTACK_DISCOVERY_GENERATION_TITLE,
      insights: ATTACK_DISCOVERY_GENERATION_INSIGHTS,
    },
    size: 20,
  });

  return graph.getGraph();
}

export const drawGraph = async ({
  getGraph,
  outputFilename,
}: {
  getGraph: (logger: Logger) => Promise<Drawable>;
  outputFilename: string;
}) => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  }) as unknown as Logger;
  logger.info('Compiling graph');
  const outputPath = path.join(__dirname, outputFilename);
  const graph = await getGraph(logger);
  const output = await graph.drawMermaidPng();
  const buffer = Buffer.from(await output.arrayBuffer());
  logger.info(`Writing graph to ${outputPath}`);
  await fs.writeFile(outputPath, buffer);
};

export const draw = async () => {
  await drawGraph({
    getGraph: getAssistantGraph,
    outputFilename: '../docs/img/default_assistant_graph.png',
  });

  await drawGraph({
    getGraph: getAttackDiscoveryGraph,
    outputFilename: '../docs/img/default_attack_discovery_graph.png',
  });
};
