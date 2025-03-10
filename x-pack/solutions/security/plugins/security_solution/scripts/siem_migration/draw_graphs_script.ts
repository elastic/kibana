/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ActionsClientChatOpenAI,
  ActionsClientSimpleChatModel,
} from '@kbn/langchain/server/language_models';
import type { Logger } from '@kbn/logging';
import { ToolingLog } from '@kbn/tooling-log';
import { FakeLLM } from '@langchain/core/utils/testing';
import fs from 'fs/promises';
import path from 'path';
import { getRuleMigrationAgent } from '../../server/lib/siem_migrations/rules/task/agent';
import type { RuleMigrationsRetriever } from '../../server/lib/siem_migrations/rules/task/retrievers';
import type { EsqlKnowledgeBase } from '../../server/lib/siem_migrations/rules/task/util/esql_knowledge_base';
import type { SiemMigrationTelemetryClient } from '../../server/lib/siem_migrations/rules/task/rule_migrations_telemetry_client';

interface Drawable {
  drawMermaidPng: () => Promise<Blob>;
}

const mockLlm = new FakeLLM({
  response: JSON.stringify({}, null, 2),
}) as unknown as ActionsClientChatOpenAI | ActionsClientSimpleChatModel;

const esqlKnowledgeBase = {} as EsqlKnowledgeBase;
const ruleMigrationsRetriever = {} as RuleMigrationsRetriever;

const createLlmInstance = () => {
  return mockLlm;
};

async function getAgentGraph(logger: Logger): Promise<Drawable> {
  const model = createLlmInstance();
  const telemetryClient = {} as SiemMigrationTelemetryClient;
  const graph = getRuleMigrationAgent({
    model,
    esqlKnowledgeBase,
    ruleMigrationsRetriever,
    logger,
    telemetryClient,
  });
  return graph.getGraphAsync({ xray: true });
}

export const drawGraph = async ({
  getGraphAsync,
  outputFilename,
}: {
  getGraphAsync: (logger: Logger) => Promise<Drawable>;
  outputFilename: string;
}) => {
  const logger = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  }) as unknown as Logger;
  logger.info('Compiling graph');
  const outputPath = path.join(__dirname, outputFilename);
  const graph = await getGraphAsync(logger);
  const output = await graph.drawMermaidPng();
  const buffer = Buffer.from(await output.arrayBuffer());
  logger.info(`Writing graph to ${outputPath}`);
  await fs.writeFile(outputPath, buffer);
};

export const draw = async () => {
  await drawGraph({
    getGraphAsync: getAgentGraph,
    outputFilename: '../../docs/siem_migration/img/agent_graph.png',
  });
};
