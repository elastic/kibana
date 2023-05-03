/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';

export async function getActiveAlert({
  ruleId,
  esClient,
  index,
}: {
  ruleId: string;
  esClient: Client;
  index: string;
}): Promise<Record<string, any>> {
  const searchParams = {
    index,
    size: 1,
    query: {
      bool: {
        filter: [
          {
            term: {
              'kibana.alert.rule.producer': 'apm',
            },
          },
          {
            term: {
              'kibana.alert.status': 'active',
            },
          },
          {
            term: {
              'kibana.alert.rule.uuid': ruleId,
            },
          },
        ],
      },
    },
  };
  const response = await esClient.search(searchParams);
  const firstHit = response.hits.hits[0];
  if (!firstHit) {
    throw new Error(`No active alert found for rule ${ruleId}`);
  }
  return firstHit;
}
