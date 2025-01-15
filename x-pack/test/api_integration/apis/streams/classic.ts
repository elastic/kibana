/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { createStreamsRepositorySupertestClient } from './helpers/repository_client';
import { disableStreams, enableStreams, fetchDocument, indexDocument } from './helpers/requests';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');

  const TEST_STREAM_NAME = 'logs-test-default';

  const apiClient = createStreamsRepositorySupertestClient(supertest);

  describe('Classic streams', () => {
    before(async () => {
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('Shows non-wired data streams', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const {
        body: { streams },
        status,
      } = await apiClient.fetch('GET /api/streams');

      expect(status).to.eql(200);

      const classicStream = streams.find((stream) => stream.name === TEST_STREAM_NAME);

      expect(classicStream).to.eql({
        name: TEST_STREAM_NAME,
        stream: {
          ingest: {
            processing: [],
            routing: [],
          },
        },
      });
    });

    it('Allows setting processing on classic streams', async () => {
      const putResponse = await apiClient.fetch('PUT /api/streams/{id}', {
        params: {
          path: {
            id: TEST_STREAM_NAME,
          },
          body: {
            ingest: {
              routing: [],
              processing: [
                {
                  config: {
                    grok: {
                      field: 'message',
                      patterns: [
                        '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      });

      expect(putResponse.status).to.eql(200);

      expect(putResponse.body).to.have.property('acknowledged', true);

      const getResponse = await apiClient.fetch('GET /api/streams/{id}', {
        params: { path: { id: TEST_STREAM_NAME } },
      });

      expect(getResponse.status).to.eql(200);

      expect(getResponse.body).to.eql({
        name: TEST_STREAM_NAME,
        dashboards: [],
        inherited_fields: {},
        lifecycle: {
          policy: 'logs',
          type: 'ilm',
        },
        stream: {
          ingest: {
            processing: [
              {
                config: {
                  grok: {
                    field: 'message',
                    patterns: [
                      '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                    ],
                  },
                },
              },
            ],
            routing: [],
          },
        },
      });
    });

    it('Executes processing on classic streams', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, TEST_STREAM_NAME, response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        message2: 'test',
        log: {
          level: 'error',
        },
      });
    });

    it('Allows removing processing on classic streams', async () => {
      const response = await apiClient.fetch('PUT /api/streams/{id}', {
        params: {
          path: { id: TEST_STREAM_NAME },
          body: {
            ingest: {
              processing: [],
              routing: [],
            },
          },
        },
      });

      expect(response.status).to.eql(200);

      expect(response.body).to.have.property('acknowledged', true);
    });

    it('Executes processing on classic streams after removing processing', async () => {
      const doc = {
        // default logs pipeline fills in timestamp with current date if not set
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, TEST_STREAM_NAME, response._id);
      expect(result._source).to.eql({
        // accept any date
        '@timestamp': (result._source as { [key: string]: unknown })['@timestamp'],
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      });
    });

    it('Allows deleting classic streams', async () => {
      const deleteStreamResponse = await apiClient.fetch('DELETE /api/streams/{id}', {
        params: {
          path: {
            id: TEST_STREAM_NAME,
          },
        },
      });

      expect(deleteStreamResponse.status).to.eql(200);

      const getStreamsResponse = await apiClient.fetch('GET /api/streams');

      expect(getStreamsResponse.status).to.eql(200);

      const classicStream = getStreamsResponse.body.streams.find(
        (stream) => stream.name === TEST_STREAM_NAME
      );
      expect(classicStream).to.eql(undefined);
    });
  });
}
