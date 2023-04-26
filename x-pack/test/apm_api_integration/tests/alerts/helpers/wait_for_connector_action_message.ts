/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';
import { ToolingLog } from '@kbn/tooling-log';
import { Client } from '@elastic/elasticsearch';
import { APM_RULE_CONNECTOR_INDEX } from './constants';
async function getConnectorActionMessage({
  messageId,
  esClient,
  log,
}: {
  messageId: string;
  waitMillis?: number;
  esClient: Client;
  log: ToolingLog;
}): Promise<Record<string, any>> {
  const searchParams = {
    index: APM_RULE_CONNECTOR_INDEX,
    size: 1,
    query: {
      bool: {
        filter: [
          {
            term: {
              'message.id': messageId,
            },
          },
        ],
      },
    },
  };
  const response = await esClient.search(searchParams);
  const firstHit = response.hits.hits[0];
  if (!firstHit) {
    throw new Error(`No active alert found for rule ${messageId}`);
  }
  return firstHit;
}

export function waitForConnectorActionMessage({
  messageId,
  esClient,
  log,
}: {
  messageId: string;
  waitMillis?: number;
  esClient: Client;
  log: ToolingLog;
}): Promise<Record<string, any>> {
  return pRetry(() => getConnectorActionMessage({ messageId, esClient, log }), {
    retries: 10,
    factor: 1.5,
  });
}
