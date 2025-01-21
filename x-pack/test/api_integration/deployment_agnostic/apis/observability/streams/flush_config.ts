/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { ReadStreamDefinition, WiredReadStreamDefinition } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, indexDocument } from './helpers/requests';

type StreamPutItem = ClientRequestParamsOf<
  StreamsRouteRepository,
  'PUT /api/streams/{id}'
>['params']['body'] & { name: string };

const streams: StreamPutItem[] = [
  {
    name: 'logs',
    ingest: {
      processing: [],
      wired: {
        fields: {
          '@timestamp': {
            type: 'date',
          },
          message: {
            type: 'match_only_text',
          },
          'host.name': {
            type: 'keyword',
          },
          'log.level': {
            type: 'keyword',
          },
        },
      },
      routing: [
        {
          name: 'logs.test',
          condition: {
            and: [
              {
                field: 'numberfield',
                operator: 'gt',
                value: 15,
              },
            ],
          },
        },
        {
          name: 'logs.test2',
          condition: {
            and: [
              {
                field: 'field2',
                operator: 'eq',
                value: 'abc',
              },
            ],
          },
        },
      ],
    },
  },
  {
    name: 'logs.test',
    ingest: {
      routing: [],
      processing: [],
      wired: {
        fields: {
          numberfield: {
            type: 'long',
          },
        },
      },
    },
  },
  {
    name: 'logs.test2',
    ingest: {
      processing: [
        {
          config: {
            grok: {
              field: 'message',
              patterns: ['%{NUMBER:numberfield}'],
            },
          },
        },
      ],
      wired: {
        fields: {
          field2: {
            type: 'keyword',
          },
        },
      },
      routing: [],
    },
  },
  {
    name: 'logs.deeply.nested.streamname',
    ingest: {
      processing: [],
      wired: {
        fields: {
          field2: {
            type: 'keyword',
          },
        },
      },
      routing: [],
    },
  },
];

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  // An anticipated use case is that a user will want to flush a tree of streams from a config file
  describe('Flush from config file', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await createStreams();
      await indexDocuments();
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('checks whether deeply nested stream is created correctly', async () => {
      function getChildNames(stream: ReadStreamDefinition['stream']) {
        return stream.ingest.routing.map((r) => r.name);
      }
      const logs = await apiClient.fetch('GET /api/streams/{id}', {
        params: {
          path: { id: 'logs' },
        },
      });
      expect(getChildNames(logs.body.stream)).to.contain('logs.deeply');

      const logsDeeply = await apiClient.fetch('GET /api/streams/{id}', {
        params: {
          path: { id: 'logs.deeply' },
        },
      });
      expect(getChildNames(logsDeeply.body.stream)).to.contain('logs.deeply.nested');

      const logsDeeplyNested = await apiClient.fetch('GET /api/streams/{id}', {
        params: {
          path: { id: 'logs.deeply.nested' },
        },
      });
      expect(getChildNames(logsDeeplyNested.body.stream)).to.contain(
        'logs.deeply.nested.streamname'
      );
      const logsDeeplyNestedStreamname = await apiClient.fetch('GET /api/streams/{id}', {
        params: {
          path: { id: 'logs.deeply.nested.streamname' },
        },
      });
      expect(
        (logsDeeplyNestedStreamname.body as WiredReadStreamDefinition).stream.ingest.wired.fields
      ).to.eql({
        field2: {
          type: 'keyword',
        },
      });
    });

    it('puts the data in the right data streams', async () => {
      const logsResponse = await esClient.search({
        index: 'logs',
        query: {
          match: { 'log.level': 'info' },
        },
      });

      expect(logsResponse.hits.total).to.eql({ value: 1, relation: 'eq' });

      const logsTestResponse = await esClient.search({
        index: 'logs.test',
        query: {
          match: { numberfield: 20 },
        },
      });

      expect(logsTestResponse.hits.total).to.eql({ value: 1, relation: 'eq' });

      const logsTest2Response = await esClient.search({
        index: 'logs.test2',
        query: {
          match: { field2: 'abc' },
        },
      });

      expect(logsTest2Response.hits.total).to.eql({ value: 1, relation: 'eq' });
    });

    async function createStreams() {
      for (const { name: streamId, ...stream } of streams) {
        await apiClient
          .fetch('PUT /api/streams/{id}', {
            params: {
              body: stream,
              path: { id: streamId },
            },
          })
          .expect(200)
          .then((response) => expect(response.body.acknowledged).to.eql(true));
      }
    }

    async function indexDocuments() {
      // send data that stays in logs
      const doc = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
        'log.level': 'info',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');

      // send data that lands in logs.test
      const doc2 = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: 'test',
        numberfield: 20,
      };
      const response2 = await indexDocument(esClient, 'logs', doc2);
      expect(response2.result).to.eql('created');

      // send data that lands in logs.test2
      const doc3 = {
        '@timestamp': '2024-01-01T00:00:00.000Z',
        message: '123',
        field2: 'abc',
      };
      const response3 = await indexDocument(esClient, 'logs', doc3);
      expect(response3.result).to.eql('created');
    }
  });
}
