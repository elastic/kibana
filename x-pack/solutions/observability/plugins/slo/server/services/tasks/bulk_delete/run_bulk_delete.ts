/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';

interface Dependencies {
  esClient: ElasticsearchClient;
  logger: Logger;
  abortController: AbortController;
}

export async function runBulkDelete(
  params: { list: string[] },
  { esClient, logger, abortController }: Dependencies
) {
  // main problem to figure out: we only have the esClient internal user.
  logger.info(`running bulk deletion: ${params.list}`);

  async function waitFor(time: number) {
    return new Promise((resolve) => setTimeout(() => resolve(1), time));
  }
  await waitFor(20000);

  logger.info(`completed bulk deletion: ${params.list}`);

  return {};
}
