/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Readable } from 'stream';
import { Client } from '@elastic/elasticsearch';
import { JsonObject } from '@kbn/utility-types';
import expect from '@kbn/expect';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { Streams } from '@kbn/streams-schema';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { ContentPackIncludedObjects, ContentPackManifest } from '@kbn/content-packs-schema';
import { StreamsSupertestRepositoryClient } from './repository_client';

export async function enableStreams(client: StreamsSupertestRepositoryClient) {
  await client.fetch('POST /api/streams/_enable 2023-10-31').expect(200);
}

export async function disableStreams(client: StreamsSupertestRepositoryClient) {
  await client.fetch('POST /api/streams/_disable 2023-10-31').expect(200);
}

export async function indexDocument(esClient: Client, index: string, document: JsonObject) {
  const response = await esClient.index({ index, document, refresh: 'wait_for' });
  return response;
}

export async function indexAndAssertTargetStream(
  esClient: Client,
  target: string,
  document: JsonObject
) {
  const response = await esClient.index({ index: 'logs', document, refresh: 'wait_for' });
  const result = await fetchDocument(esClient, target, response._id);
  expect(result._index).to.match(new RegExp(`^\.ds\-${target}-.*`));
  return result;
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
    'POST /api/streams/{name}/_fork 2023-10-31'
  >['params']['body'],
  expectedStatusCode: number = 200
) {
  return client
    .fetch(`POST /api/streams/{name}/_fork 2023-10-31`, {
      params: {
        path: {
          name: root,
        },
        body,
      },
    })
    .expect(expectedStatusCode)
    .then((response) => response.body);
}

export async function putStream(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: Streams.all.UpsertRequest,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('PUT /api/streams/{name} 2023-10-31', {
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
    .fetch('GET /api/streams/{name} 2023-10-31', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getIlmStats(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /internal/streams/{name}/lifecycle/_stats', {
      params: {
        path: {
          name,
        },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function getQueries(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('GET /api/streams/{name}/queries 2023-10-31', {
      params: {
        path: { name },
      },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function linkDashboard(
  apiClient: StreamsSupertestRepositoryClient,
  stream: string,
  id: string
) {
  const response = await apiClient.fetch(
    'PUT /api/streams/{name}/dashboards/{dashboardId} 2023-10-31',
    {
      params: { path: { name: stream, dashboardId: id } },
    }
  );

  expect(response.status).to.be(200);
}

export async function exportContent(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: ContentPackManifest & {
    include: ContentPackIncludedObjects;
    replaced_patterns: string[];
  },
  expectStatusCode: number = 200
) {
  return await apiClient
    .fetch('POST /api/streams/{name}/content/export 2023-10-31', {
      params: {
        path: { name },
        body,
      },
    })
    .responseType('blob')
    .expect(expectStatusCode)
    .then((response) => response.body);
}

export async function importContent(
  apiClient: StreamsSupertestRepositoryClient,
  name: string,
  body: {
    include: ContentPackIncludedObjects;
    content: Readable;
    filename: string;
  },
  expectStatusCode: number = 200
) {
  return await apiClient
    .sendFile('POST /api/streams/{name}/content/import 2023-10-31', {
      params: {
        path: { name },
        body: {
          include: JSON.stringify(body.include),
          content: body.content,
        },
      },
      file: { key: 'content', filename: body.filename },
    })
    .expect(expectStatusCode)
    .then((response) => response.body);
}
