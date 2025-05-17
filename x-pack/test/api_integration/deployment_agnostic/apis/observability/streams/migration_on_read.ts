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

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  // This test verifies that it's still possible to read an existing stream definition without
  // error. If it fails, it indicates that the migration logic is not working as expected.
  describe('read existing stream definition format', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should read and return existing orphaned classic stream', async () => {
      await esClient.index({
        index: '.kibana_streams-000001',
        id: TEST_STREAM_NAME,
        document: streamDefinition,
      });

      // Refresh the index to make the document searchable
      await esClient.indices.refresh({ index: '.kibana_streams-000001' });
      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });

      expect(getResponse.status).to.eql(200);
      expect(getResponse.body.stream).to.eql(expectedStreamsResponse);
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
    });
  });
}
