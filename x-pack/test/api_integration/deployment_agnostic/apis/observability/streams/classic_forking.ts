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
  fetchDocument,
  /* fetchDocument,*/ indexDocument,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  // const config = getService('config');
  // const isServerless = !!config.get('serverless');

  const TEST_STREAM_NAME = 'logs-test.nested-default';

  let apiClient: StreamsSupertestRepositoryClient;

  describe.only('Forking classic streams', () => {
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
            condition: {
              field: 'abc',
              operator: 'exists',
            },
          },
        },
      });

      expect(resp.status).to.eql(200);

      const {
        body: { streams },
      } = await apiClient.fetch('GET /api/streams');

      const classicStream = streams.find(
        (stream) => stream.name === 'logs-test.nested.myfork-default'
      );

      expect(classicStream).to.eql({
        name: 'logs-test.nested.myfork-default',
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
    });

    it('Allows sending data to the forked stream', async () => {
      const doc = {
        message: 'hello world',
        '@timestamp': '2024-01-01T00:00:10.000Z',
        abc: 'test',
      };
      const response = await indexDocument(esClient, 'logs-test.nested-default', doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, 'logs-test.nested.myfork-default', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: 'hello world',
        abc: 'test',
      });
    });

    // it('Allows forking a wired stream from an unwired root', async () => {});

    // it('Allows adding processing and fields to wired child', async () => {});

    // it('Validates field rules within tree of wired streams under classic root', async () => {});

    // it('Allows creating a wired child for classic stream via PUT', async () => {});
    
    // it('Allows creating a wired child for classic stream via PUT and extending routing array', async () => {});
 
    // it('Allows creating multi-nested wired children via PUT API', async () => {});
  });
}
