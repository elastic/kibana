/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { IngestStreamUpsertRequest } from '@kbn/streams-schema';
import {
  disableStreams,
  enableStreams,
  fetchDocument,
  forkStream,
  indexDocument,
  putStream,
} from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Enrichment', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      const body = {
        stream: {
          name: 'logs.nginx',
        },
        if: {
          field: 'host.name',
          operator: 'eq' as const,
          value: 'routeme',
        },
      };
      // We use a forked stream as processing changes cannot be made to the root stream
      await forkStream(apiClient, 'logs', body);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('Place processing steps', async () => {
      const body: IngestStreamUpsertRequest = {
        dashboards: [],
        stream: {
          ingest: {
            lifecycle: { inherit: {} },
            processing: [
              {
                grok: {
                  field: 'message',
                  patterns: [
                    '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                  ],
                  if: { always: {} },
                },
              },
              {
                dissect: {
                  field: 'message2',
                  pattern: '%{log.logger} %{message3}',
                  if: {
                    field: 'log.level',
                    operator: 'eq',
                    value: 'info',
                  },
                },
              },
            ],
            routing: [],
            wired: {
              fields: {
                '@timestamp': {
                  type: 'date',
                },
                message: {
                  type: 'match_only_text',
                },
                message2: {
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
          },
        },
      };
      const response = await putStream(apiClient, 'logs.nginx', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('Index doc not matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['host.name']: 'routeme',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, 'logs.nginx', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        'host.name': 'routeme',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        message2: 'test',
        'log.level': 'error',
        'stream.name': 'logs.nginx',
      });
    });

    it('Index doc matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        ['host.name']: 'routeme',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, 'logs.nginx', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        'host.name': 'routeme',
        'log.level': 'info',
        'log.logger': 'mylogger',
        message2: 'mylogger this is the message',
        message3: 'this is the message',
        'stream.name': 'logs.nginx',
      });
    });

    it('Doc is searchable', async () => {
      const response = await esClient.search({
        index: 'logs.nginx',
        body: {
          query: {
            match: {
              message2: 'mylogger',
            },
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(1);
    });

    it('Non-indexed field is not searchable', async () => {
      const response = await esClient.search({
        index: 'logs.nginx',
        body: {
          query: {
            match: {
              'log.logger': 'mylogger',
            },
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(0);
    });
  });
}
