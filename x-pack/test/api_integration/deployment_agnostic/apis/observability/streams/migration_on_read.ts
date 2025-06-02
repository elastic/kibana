/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { disableStreams, enableStreams, indexDocument } from './helpers/requests';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

const TEST_STREAM_NAME = 'logs-test-default';

const streamDefinition = {
  name: TEST_STREAM_NAME,
  ingest: {
    lifecycle: {
      ilm: {
        policy: 'logs-default',
      },
    },
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
    unwired: {},
  },
};

const expectedStreamsResponse: Streams.UnwiredStream.Definition = {
  name: TEST_STREAM_NAME,
  description: '',
  ingest: {
    lifecycle: {
      ilm: {
        policy: 'logs-default',
      },
    },
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
    unwired: {},
  },
};

function expectStreams(expectedStreams: string[], persistedStreams: Streams.all.Definition[]) {
  for (const name of expectedStreams) {
    expect(persistedStreams.some((stream) => stream.name === name)).to.eql(true);
  }
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  // This test verifies that it's still possible to read an existing stream definition without
  // error. If it fails, it indicates that the migration logic is not working as expected.
  describe('read existing stream definition format', function () {
    // This test can't run on MKI because there is no way to create a stream definition document that doesn't match the
    // currently valid format. The test is designed to verify that the migration logic is working correctly.
    this.tags(['failsOnMKI']);
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await esClient.index({
        index: '.kibana_streams-000001',
        id: TEST_STREAM_NAME,
        document: streamDefinition,
      });

      // Refresh the index to make the document searchable
      await esClient.indices.refresh({ index: '.kibana_streams-000001' });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should read and return existing orphaned classic stream', async () => {
      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });

      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.stream).to.eql(expectedStreamsResponse);

      const listResponse = await apiClient.fetch('GET /api/streams 2023-10-31');
      expect(listResponse.status).to.eql(200);
      expectStreams(['logs', TEST_STREAM_NAME], listResponse.body.streams);

      const dashboardResponse = await apiClient.fetch(
        'GET /api/streams/{name}/dashboards 2023-10-31',
        {
          params: {
            path: { name: TEST_STREAM_NAME },
          },
        }
      );
      expect(dashboardResponse.status).to.eql(200);
    });

    it('should read and return existing regular classic stream', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');
      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });

      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.stream).to.eql(expectedStreamsResponse);

      const listResponse = await apiClient.fetch('GET /api/streams 2023-10-31');
      expect(listResponse.status).to.eql(200);
      expectStreams(['logs', TEST_STREAM_NAME], listResponse.body.streams);

      const dashboardResponse = await apiClient.fetch(
        'GET /api/streams/{name}/dashboards 2023-10-31',
        {
          params: {
            path: { name: TEST_STREAM_NAME },
          },
        }
      );
      expect(dashboardResponse.status).to.eql(200);
    });
  });
}
