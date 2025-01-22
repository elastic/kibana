/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  indexDocument,
  putStream,
  assertStreamInList,
  assertDocInIndex,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  const TEST_STREAM_NAME = 'logs-test.nested-default';

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Forking classic streams', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('Allows to fork classic data stream', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const resp = await apiClient.fetch('POST /api/streams/{id}/_fork', {
        params: {
          path: {
            id: TEST_STREAM_NAME,
          },
          body: {
            stream: { name: 'logs-test.nested.myfork-default' },
            if: {
              field: 'abc',
              operator: 'exists',
            },
          },
        },
      });

      expect(resp.status).to.eql(200);

      await assertStreamInList(apiClient, 'logs-test.nested.myfork-default', {
        name: 'logs-test.nested.myfork-default',
        ingest: {
          processing: [],
          routing: [],
          wired: {
            fields: {},
          },
        },
      });
    });

    it('Allows sending data to the forked stream', async () => {
      const doc = {
        message: 'hello world',
        '@timestamp': '2024-01-01T00:00:10.000Z',
        abc: 'test',
      };
      await assertDocInIndex(
        esClient,
        'logs-test.nested-default',
        'logs-test.nested.myfork-default',
        doc
      );
    });

    it('Allows forking a wired stream from an unwired root', async () => {
      const resp = await apiClient.fetch('POST /api/streams/{id}/_fork', {
        params: {
          path: {
            id: 'logs-test.nested.myfork-default',
          },
          body: {
            stream: { name: 'logs-test.nested.myfork.doublefork-default' },
            if: {
              field: 'xyz',
              operator: 'exists',
            },
          },
        },
      });

      expect(resp.status).to.eql(200);
    });

    it('Allows sending data to the forked sub stream', async () => {
      const doc = {
        message: 'hello world',
        '@timestamp': '2024-01-01T00:00:10.000Z',
        abc: 'test',
        xyz: 'test',
      };
      await assertDocInIndex(
        esClient,
        'logs-test.nested-default',
        'logs-test.nested.myfork.doublefork-default',
        doc
      );
    });

    it('Allows adding processing and fields to wired child', async () => {
      await putStream(apiClient, 'logs-test.nested.myfork.doublefork-default', {
        dashboards: [],
        stream: {
          ingest: {
            processing: [
              {
                grok: {
                  field: 'message',
                  patterns: ['%{WORD:firstword}'],
                  if: { always: {} },
                },
              },
            ],
            routing: [],
            wired: {
              fields: {
                firstword: {
                  type: 'keyword',
                },
              },
            },
          },
        },
      });
    });

    it('Executes processing on the forked stream', async () => {
      const doc = {
        message: 'hello world',
        '@timestamp': '2024-01-01T00:00:10.000Z',
        abc: 'test',
        xyz: 'test',
      };
      await assertDocInIndex(
        esClient,
        'logs-test.nested-default',
        'logs-test.nested.myfork.doublefork-default',
        {
          ...doc,
          firstword: 'hello',
        }
      );

      const searchResponse = await esClient.search({
        index: 'logs-test.nested.myfork.doublefork-default',
        query: {
          term: {
            firstword: {
              value: 'hello',
            },
          },
        },
      });
      expect(searchResponse.hits.total).to.eql({ value: 1, relation: 'eq' });
    });

    it('Validates field rules within tree of wired streams under classic root', async () => {
      await putStream(
        apiClient,
        'logs-test.nested.myfork.doublefork.evendeeper-default',
        {
          dashboards: [],
          stream: {
            ingest: {
              processing: [],
              routing: [],
              wired: {
                fields: {
                  firstword: {
                    type: 'long',
                  },
                },
              },
            },
          },
        },
        400
      );
    });

    it('Allows creating a wired child for classic stream via PUT', async () => {
      await putStream(apiClient, 'logs-test.nested.myfork2-default', {
        dashboards: [],
        stream: {
          ingest: {
            processing: [],
            routing: [],
            wired: {
              fields: {
                atest: {
                  type: 'long',
                },
              },
            },
          },
        },
      });

      await assertStreamInList(apiClient, 'logs-test.nested.myfork2-default', {
        name: 'logs-test.nested.myfork2-default',
        ingest: {
          processing: [],
          routing: [],
          wired: {
            fields: {
              atest: {
                type: 'long',
              },
            },
          },
        },
      });
    });

    it('Allows creating a wired child for classic stream via PUT and extending routing array', async () => {
      await putStream(apiClient, 'logs-test.nested-default', {
        dashboards: [],
        stream: {
          ingest: {
            processing: [],
            routing: [
              {
                destination: 'logs-test.nested.myfork-default',
                if: {
                  field: 'abc',
                  operator: 'exists',
                },
              },
              {
                destination: 'logs-test.nested.myfork2-default',
                if: {
                  field: 'otherfield',
                  operator: 'exists',
                },
              },
            ],
            unwired: {},
          },
        },
      });

      const doc = {
        message: 'hello world',
        '@timestamp': '2024-01-01T00:00:10.000Z',
        otherfield: 'test',
      };
      await assertDocInIndex(
        esClient,
        'logs-test.nested-default',
        'logs-test.nested.myfork2-default',
        doc
      );
    });

    it('Allows creating multi-nested wired children via PUT API', async () => {
      await putStream(apiClient, 'logs-test.nested.myfork3.deeply.nested-default', {
        dashboards: [],
        stream: {
          ingest: {
            processing: [],
            routing: [],
            wired: {
              fields: {},
            },
          },
        },
      });

      const {
        body: { streams },
      } = await apiClient.fetch('GET /api/streams');

      expect(streams.some((stream) => stream.name === 'logs-test.nested.myfork3-default')).to.be(
        true
      );
      expect(
        streams.some((stream) => stream.name === 'logs-test.nested.myfork3.deeply-default')
      ).to.be(true);
      expect(
        streams.some((stream) => stream.name === 'logs-test.nested.myfork3.deeply.nested-default')
      ).to.be(true);
    });

    it('Validates whether an unwired root exists before creating substreams', async () => {
      await putStream(
        apiClient,
        'logs-woopy.doopy-default',
        {
          dashboards: [],
          stream: {
            ingest: {
              processing: [],
              routing: [],
              wired: {
                fields: {},
              },
            },
          },
        },
        400
      );
    });
  });
}
