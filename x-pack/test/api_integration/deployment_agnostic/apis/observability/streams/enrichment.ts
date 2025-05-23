/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import { Streams } from '@kbn/streams-schema';
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
      const body: Streams.WiredStream.UpsertRequest = {
        dashboards: [],
        queries: [],
        stream: {
          description: '',
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
            wired: {
              routing: [],
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
        query: {
          match: {
            message2: 'mylogger',
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(1);
    });

    it('Non-indexed field is not searchable', async () => {
      const response = await esClient.search({
        index: 'logs.nginx',
        query: {
          match: {
            'log.logger': 'mylogger',
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(0);
    });

    describe('Elasticsearch ingest pipeline enrichment', () => {
      before(async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: [
                {
                  advanced_json: {
                    processors: [
                      {
                        // apply custom processor
                        uppercase: {
                          field: 'abc',
                        },
                      },
                      {
                        // apply condition
                        lowercase: {
                          field: 'def',
                          if: "ctx.def == 'yes'",
                        },
                      },
                      {
                        fail: {
                          message: 'Failing',
                          on_failure: [
                            // execute on failure pipeline
                            {
                              set: {
                                field: 'fail_failed',
                                value: 'yes',
                              },
                            },
                          ],
                        },
                      },
                    ],
                    if: { always: {} },
                  },
                },
              ],
              wired: {
                routing: [],
                fields: {},
              },
            },
          },
        };
        const response = await putStream(apiClient, 'logs.nginx', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Transforms doc on index', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:11.000Z',
          abc: 'should become uppercase',
          def: 'SHOULD NOT BECOME LOWERCASE',
          ['host.name']: 'routeme',
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');

        const result = await fetchDocument(esClient, 'logs.nginx', response._id);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:11.000Z',
          abc: 'SHOULD BECOME UPPERCASE',
          def: 'SHOULD NOT BECOME LOWERCASE',
          fail_failed: 'yes',
          'host.name': 'routeme',
          'stream.name': 'logs.nginx',
        });
      });

      it('fails to store non-existing processor', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: [
                {
                  advanced_json: {
                    processors: [
                      {
                        // apply custom processor
                        non_existing_processor: {
                          field: 'abc',
                        },
                      } as any,
                    ],
                    if: { always: {} },
                  },
                },
              ],
              wired: {
                routing: [],
                fields: {},
              },
            },
          },
        };
        await putStream(apiClient, 'logs.nginx', body, 400);
      });
    });
  });
}
