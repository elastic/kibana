/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { Client } from '@elastic/elasticsearch';
import { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { StreamUpsertRequest } from '@kbn/streams-schema';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { StreamsSupertestRepositoryClient } from './repository_client';

export async function enableStreams(client: StreamsSupertestRepositoryClient) {
  await client.fetch('POST /api/streams/_enable').expect(200);
}

export async function disableStreams(client: StreamsSupertestRepositoryClient) {
  await client.fetch('POST /api/streams/_disable').expect(200);
}

export async function indexDocument(esClient: Client, index: string, document: JsonObject) {
  const response = await esClient.index({ index, document, refresh: 'wait_for' });
  return response;
}

export async function fetchDocument(esClient: Client, index: string, id: string) {
  const query = {
    ids: { values: [id] },
  };
  const response = await esClient.search({ index, query });
  expect((response.hits.total as SearchTotalHits).value).to.eql(1);
  return response.hits.hits[0];
}

export async function forkStream(
  client: StreamsSupertestRepositoryClient,
  root: string,
  body: ClientRequestParamsOf<
    StreamsRouteRepository,
    'POST /api/streams/{name}/_fork'
  >['params']['body']
) {
  return client
    .fetch(`POST /api/streams/{name}/_fork`, {
      params: {
        path: {
          name: root,
        },
        body,
      },
    })
    .expect(200)
    .then((response) => response.body);
}

export async function putStream(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: StreamUpsertRequest,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('PUT /api/streams/{name}', {
      params: {
        path: {
          name,
        },
        body,
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getStream(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /api/streams/{name}', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}
