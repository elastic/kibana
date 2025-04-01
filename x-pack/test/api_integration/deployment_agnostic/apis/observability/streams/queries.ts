/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { WiredIngestUpsertRequest } from '@kbn/streams-schema';
import { v4 } from 'uuid';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, getQueries, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  const STREAM_NAME = 'logs.queries-test';
  const stream: WiredIngestUpsertRequest = {
    ingest: {
      lifecycle: { inherit: {} },
      processing: [],
      wired: {
        routing: [],
        fields: {
          numberfield: {
            type: 'long',
          },
        },
      },
    },
  };

  describe('Queries API', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    beforeEach(async () => {
      await putStream(apiClient, STREAM_NAME, {
        stream,
        dashboards: [],
        queries: [],
      });
    });

    it('lists empty queries when none are defined on the stream', async () => {
      const response = await getQueries(apiClient, STREAM_NAME);

      expect(response).to.eql({ queries: [] });
    });

    it('lists queries when defined on the stream', async () => {
      const queries = [
        { id: v4(), title: 'OutOfMemoryError', kql: { query: "message:'OutOfMemoryError'" } },
        {
          id: v4(),
          title: 'cluster_block_exception',
          kql: { query: "message:'cluster_block_exception'" },
        },
      ];

      const updateStreamResponse = await putStream(apiClient, STREAM_NAME, {
        stream,
        dashboards: [],
        queries,
      });
      expect(updateStreamResponse).to.have.property('acknowledged', true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql(queries);
    });

    it('inserts a query when inexistant', async () => {
      const query = { id: v4(), title: 'Significant Query', kql: { query: "message:'query'" } };
      const upsertQueryResponse = await apiClient
        .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: {
            path: { name: STREAM_NAME, queryId: query.id },
            body: {
              title: query.title,
              kql: query.kql,
            },
          },
        })
        .expect(200)
        .then((res) => res.body);
      expect(upsertQueryResponse.acknowledged).to.be(true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([query]);
    });

    it('updates a query when already defined', async () => {
      const queryId = v4();
      await putStream(apiClient, STREAM_NAME, {
        stream,
        dashboards: [],
        queries: [
          {
            id: queryId,
            title: 'Significant Query',
            kql: { query: "message:'query'" },
          },
        ],
      });

      const upsertQueryResponse = await apiClient
        .fetch('PUT /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: {
            path: { name: STREAM_NAME, queryId },
            body: {
              title: 'Another title',
              kql: { query: "message:'Something else'" },
            },
          },
        })
        .expect(200)
        .then((res) => res.body);
      expect(upsertQueryResponse.acknowledged).to.be(true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([
        {
          id: queryId,
          title: 'Another title',
          kql: { query: "message:'Something else'" },
        },
      ]);
    });

    it('deletes an existing query successfully', async () => {
      const queryId = v4();
      await putStream(apiClient, STREAM_NAME, {
        stream,
        dashboards: [],
        queries: [
          {
            id: queryId,
            title: 'Significant Query',
            kql: { query: "message:'query'" },
          },
        ],
      });

      const deleteQueryResponse = await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(200)
        .then((res) => res.body);
      expect(deleteQueryResponse.acknowledged).to.be(true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([]);
    });

    it('throws when deleting an inexistant query', async () => {
      const queryId = v4();
      await apiClient
        .fetch('DELETE /api/streams/{name}/queries/{queryId} 2023-10-31', {
          params: { path: { name: STREAM_NAME, queryId } },
        })
        .expect(404);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([]);
    });

    it('bulks insert and remove queries', async () => {
      const existingQueryId = v4();
      await putStream(apiClient, STREAM_NAME, {
        stream,
        dashboards: [],
        queries: [
          {
            id: existingQueryId,
            title: 'Significant Query',
            kql: { query: "message:'query'" },
          },
        ],
      });

      const newQuery1 = {
        id: v4(),
        title: 'query1',
        kql: { query: 'irrelevant1' },
      };
      const newQuery2 = {
        id: v4(),
        title: 'query2',
        kql: { query: 'irrelevant2' },
      };

      const bulkResponse = await apiClient
        .fetch('POST /api/streams/{name}/queries/_bulk 2023-10-31', {
          params: {
            path: { name: STREAM_NAME },
            body: {
              operations: [
                {
                  index: newQuery1,
                },
                {
                  delete: {
                    id: 'inexistant',
                  },
                },
                {
                  index: newQuery2,
                },
                {
                  delete: {
                    id: existingQueryId,
                  },
                },
              ],
            },
          },
        })
        .expect(200)
        .then((res) => res.body);
      expect(bulkResponse).to.have.property('acknowledged', true);

      const getQueriesResponse = await getQueries(apiClient, STREAM_NAME);
      expect(getQueriesResponse.queries).to.eql([newQuery1, newQuery2]);
    });
  });
}
