/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { estypes } from '@elastic/elasticsearch';
import pRetry from 'p-retry';
import { Logger, ElasticsearchClient } from '@kbn/core/server';

export type Mappings = Required<estypes.IndicesCreateRequest>['mappings'] &
  Omit<estypes.IndicesPutMappingRequest, 'index'>;

export async function createOrUpdateIndex({
  index,
  mappings,
  client,
  logger,
}: {
  index: string;
  mappings?: Mappings;
  client: ElasticsearchClient;
  logger: Logger;
}) {
  try {
    /*
     * In some cases we could be trying to create an index before ES is ready.
     * When this happens, we retry creating the index with exponential backoff.
     * We use retry's default formula, meaning that the first retry happens after 2s,
     * the 5th after 32s, and the final attempt after around 17m. If the final attempt fails,
     * the error is logged to the console.
     * See https://github.com/sindresorhus/p-retry and https://github.com/tim-kos/node-retry.
     */
    await pRetry(
      async () => {
        const indexExists = await client.indices.exists({ index });
        const result = indexExists
          ? await updateExistingIndex({
              index,
              client,
              mappings,
            })
          : await createNewIndex({
              index,
              client,
              mappings,
            });

        if (!result.acknowledged) {
          const bodyWithError: { body?: { error: any } } = result as any;
          const resultError = JSON.stringify(bodyWithError?.body?.error);
          throw new Error(resultError);
        }
      },
      {
        onFailedAttempt: (e) => {
          logger.warn(`Could not create index: '${index}'. Retrying...`, { error: e });
        },
      }
    );
  } catch (e) {
    logger.error(`Could not create index: '${index}'`, { error: e });
  }
}

function createNewIndex({
  index,
  client,
  mappings,
}: {
  index: string;
  client: ElasticsearchClient;
  mappings?: Required<estypes.IndicesCreateRequest>['mappings'];
}) {
  return client.indices.create({
    index,
    // auto_expand_replicas: Allows cluster to not have replicas for this index
    settings: { index: { auto_expand_replicas: '0-1' } },
    mappings,
  });
}

function updateExistingIndex({
  index,
  client,
  mappings,
}: {
  index: string;
  client: ElasticsearchClient;
  mappings?: Omit<estypes.IndicesPutMappingRequest, 'index'>;
}) {
  return client.indices.putMapping({
    index,
    ...mappings,
  });
}
