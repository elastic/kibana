/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs/promises';
import path from 'path';
import type {
  ActionsClientChatOpenAI,
  ActionsClientLlm,
} from '@kbn/langchain/server/language_models';
import type { Logger } from '@kbn/logging';
import { FakeChatModel, FakeLLM } from '@langchain/core/utils/testing';
import type { ContentReferencesStore } from '@kbn/elastic-assistant-common';
import { DefendInsightType } from '@kbn/elastic-assistant-common';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type { ActionsClient } from '@kbn/actions-plugin/server';
import { MemorySaver } from '@langchain/langgraph-checkpoint';
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
  DEFEND_INSIGHTS,
} from '../server/lib/prompt/prompts';
import { getDefaultAssistantGraph } from '../server/lib/langchain/graphs/default_assistant_graph/graph';
import { getDefaultAttackDiscoveryGraph } from '../server/lib/attack_discovery/graphs/default_attack_discovery_graph';
import { getDefaultDefendInsightsGraph } from '../server/lib/defend_insights/graphs/default_defend_insights_graph';

/**
 * Sometimes there is a cloudflare error from mermaid.ink (mermaid js rendered).
 *  Error: Failed to render the graph using the Mermaid.INK API.
 *  Status code: 502
 *  Status text: Bad Gateway
 * The error seems to be intermittent, try again after a few minutes.
 */
interface Drawable {
  drawMermaidPng: () => Promise<Blob>;
}

const mockLlm = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI;

class FakeChatModelWithBindTools extends FakeChatModel {
  bindTools = () => this;
}

const createLlmInstance = () => {
  const model = new FakeChatModelWithBindTools({});
  return Promise.resolve(model);
};

async function getAssistantGraph(logger: Logger): Promise<Drawable> {
  const graph = await getDefaultAssistantGraph({
    actionsClient: {} as unknown as PublicMethodsOf<ActionsClient>,
    logger,
    createLlmInstance,
    tools: [],
    savedObjectsClient: {} as unknown as SavedObjectsClientContract,
    contentReferencesStore: {} as unknown as ContentReferencesStore,
    checkpointSaver: new MemorySaver(),
  });
  return graph.getGraphAsync({ xray: true });
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

async function getDefendInsightsGraph(logger: Logger): Promise<Drawable> {
  const mockEsClient = {} as unknown as ElasticsearchClient;

  const graph = getDefaultDefendInsightsGraph({
    insightType: DefendInsightType.Enum.incompatible_antivirus,
    endpointIds: ['mock-endpoint-1'],
    anonymizationFields: [],
    esClient: mockEsClient,
    kbDataClient: null,
    llm: mockLlm as unknown as ActionsClientLlm,
    logger,
    replacements: {},
    prompts: {
      default: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.DEFAULT,
      refine: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.REFINE,
      continue: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.CONTINUE,
      group: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.GROUP,
      events: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS,
      eventsId: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS_ID,
      eventsEndpointId: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS_ENDPOINT_ID,
      eventsValue: DEFEND_INSIGHTS.INCOMPATIBLE_ANTIVIRUS.EVENTS_VALUE,
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

  await drawGraph({
    getGraph: getDefendInsightsGraph,
    outputFilename: '../docs/img/default_defend_insights_graph.png',
  });
};
