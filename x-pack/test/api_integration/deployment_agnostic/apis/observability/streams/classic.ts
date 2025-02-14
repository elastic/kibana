/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { asUnwiredStreamGetResponse } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { disableStreams, enableStreams, fetchDocument, indexDocument } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const config = getService('config');
  const isServerless = !!config.get('serverless');

  const TEST_STREAM_NAME = 'logs-test-default';

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Classic streams', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('non-wired data streams', async () => {
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
        ingest: {
          lifecycle: { inherit: {} },
          processing: [],
          routing: [],
          unwired: {},
        },
      });
    });

    it('Allows setting processing on classic streams', async () => {
      const putResponse = await apiClient.fetch('PUT /api/streams/{name}', {
        params: {
          path: {
            name: TEST_STREAM_NAME,
          },
          body: {
            dashboards: [],
            stream: {
              ingest: {
                lifecycle: { inherit: {} },
                routing: [],
                processing: [
                  {
                    grok: {
                      if: { always: {} },
                      field: 'message',
                      patterns: [
                        '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                      ],
                    },
                  },
                ],
                unwired: {},
              },
            },
          },
        },
      });

      expect(putResponse.status).to.eql(200);

      expect(putResponse.body).to.have.property('acknowledged', true);

      const getResponse = await apiClient.fetch('GET /api/streams/{name}', {
        params: { path: { name: TEST_STREAM_NAME } },
      });

      expect(getResponse.status).to.eql(200);

      const body = asUnwiredStreamGetResponse(getResponse.body);

      const {
        dashboards,
        stream,
        effective_lifecycle: effectiveLifecycle,
        elasticsearch_assets: elasticsearchAssets,
      } = body;

      expect(dashboards).to.eql([]);

      expect(stream).to.eql({
        name: TEST_STREAM_NAME,
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
          ],
          routing: [],
          unwired: {},
        },
      });

      expect(effectiveLifecycle).to.eql(isServerless ? { dsl: {} } : { ilm: { policy: 'logs' } });

      expect(elasticsearchAssets).to.eql([
        {
          type: 'ingest_pipeline',
          id: 'logs@default-pipeline',
        },
        {
          type: 'component_template',
          id: 'logs@mappings',
        },
        {
          type: 'component_template',
          id: 'logs@settings',
        },
        {
          type: 'component_template',
          id: 'logs@custom',
        },
        { type: 'component_template', id: 'ecs@mappings' },
        {
          type: 'index_template',
          id: 'logs',
        },
        {
          type: 'data_stream',
          id: 'logs-test-default',
        },
      ]);
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
      const response = await apiClient.fetch('PUT /api/streams/{name}', {
        params: {
          path: { name: TEST_STREAM_NAME },
          body: {
            dashboards: [],
            stream: {
              ingest: {
                lifecycle: { inherit: {} },
                processing: [],
                routing: [],
                unwired: {},
              },
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
      const deleteStreamResponse = await apiClient.fetch('DELETE /api/streams/{name}', {
        params: {
          path: {
            name: TEST_STREAM_NAME,
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

    describe('Classic stream without pipeline', () => {
      const TEMPLATE_NAME = 'mytemplate';
      const DATA_STREAM_NAME = 'mytest-abc';

      before(async () => {
        await esClient.indices.putIndexTemplate({
          name: TEMPLATE_NAME,
          body: {
            index_patterns: ['mytest*'],
            priority: 1000,
            template: {
              lifecycle: {
                data_retention: '7d',
              },
            },
            data_stream: {
              allow_custom_routing: false,
              hidden: false,
            },
          },
        });

        await esClient.indices.createDataStream({
          name: DATA_STREAM_NAME,
        });
      });

      after(async () => {
        await esClient.indices.deleteDataStream({
          name: DATA_STREAM_NAME,
        });

        await esClient.indices.deleteIndexTemplate({
          name: TEMPLATE_NAME,
        });
      });

      it('Allows adding processing to classic streams without pipeline', async () => {
        const putResponse = await apiClient.fetch('PUT /api/streams/{name}', {
          params: {
            path: {
              name: DATA_STREAM_NAME,
            },
            body: {
              dashboards: [],
              stream: {
                ingest: {
                  lifecycle: { inherit: {} },
                  routing: [],
                  processing: [
                    {
                      grok: {
                        if: { always: {} },
                        field: 'message',
                        patterns: [
                          '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                        ],
                      },
                    },
                  ],
                  unwired: {},
                },
              },
            },
          },
        });

        expect(putResponse.status).to.eql(200);
        expect(putResponse.body).to.have.property('acknowledged', true);
      });

      it('Executes processing on classic streams without pipeline', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: '2023-01-01T00:00:10.000Z error test',
        };
        const response = await indexDocument(esClient, DATA_STREAM_NAME, doc);
        expect(response.result).to.eql('created');

        const result = await fetchDocument(esClient, DATA_STREAM_NAME, response._id);
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
    });
  });
}
