/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { Client } from '@elastic/elasticsearch';
import { APM_RULE_CONNECTOR_INDEX } from './constants';

interface ActionMessageAggResponse {
  message: {
    buckets: Array<{
      key: string;
      doc_count: number;
    }>;
  };
}

async function getConnectorActionMessage({
  messageId,
  esClient,
}: {
  messageId?: string;
  esClient: Client;
}): Promise<string> {
  const searchParams = {
    index: APM_RULE_CONNECTOR_INDEX,
    body: {
      fields: ['id.keyword', 'message.keyword'],
      aggs: {
        id: {
          filter: {
            term: {
              'id.keyword': messageId,
            },
          },
          aggs: {
            message: {
              terms: {
                field: 'message.keyword',
              },
            },
          },
        },
      },
    },
  };

  const response = await esClient.search(searchParams);

  const action = response?.aggregations?.id as ActionMessageAggResponse;

  if (!action) {
    throw new Error(`No action found for the id: ${messageId}`);
  }

  if (!action.message.buckets.length) {
    throw new Error(`No message found for the action: ${messageId}`);
  } else {
    return action.message.buckets[0].key;
  }
}

export function waitForConnectorActionMessage({
  messageId,
  esClient,
}: {
  messageId?: string;
  esClient: Client;
}): Promise<string> {
  return pRetry(() => getConnectorActionMessage({ messageId, esClient }), {
    retries: 10,
    factor: 1.5,
  });
}
