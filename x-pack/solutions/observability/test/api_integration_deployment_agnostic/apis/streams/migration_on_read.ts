/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams } from '@kbn/streams-schema';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { disableStreams, enableStreams, indexDocument } from './helpers/requests';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { loadDashboards } from './helpers/dashboards';

const TEST_STREAM_NAME = 'logs-test-default';
const TEST_DASHBOARD_ID = '9230e631-1f1a-476d-b613-4b074c6cfdd0';

// Do not update these if tests are failing - this is testing whether they get migrated correctly - you should
// always make sure that existing definitions and links keep working.

const assetLinks = [
  {
    'asset.type': 'query',
    'asset.id': '12345',
    'asset.uuid': '761ea54139754abb6e486ec1e29ea5c7f4df1387',
    'stream.name': TEST_STREAM_NAME,
    'query.title': 'Test',
    'query.kql.query': 'atest',
  },
  {
    'asset.type': 'dashboard',
    'asset.id': TEST_DASHBOARD_ID,
    'asset.uuid': 'a9e60eb2bc5fa77d1f66a612db29d2764ff8cf4a',
    'stream.name': TEST_STREAM_NAME,
  },
];

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

const expectedDashboardsResponse = {
  dashboards: [
    {
      id: TEST_DASHBOARD_ID,
      title: 'dashboard-4-panels',
      tags: [],
    },
  ],
};

const expectedQueriesResponse = {
  queries: [
    {
      id: '12345',
      title: 'Test',
      kql: { query: 'atest' },
    },
  ],
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
  const kibanaServer = getService('kibanaServer');
  const SPACE_ID = 'default';
  const ARCHIVES = [
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/content_pack_four_panels.json',
  ];

  // This test verifies that it's still possible to read an existing stream definition without
  // error. If it fails, it indicates that the migration logic is not working as expected.
  describe('read existing stream definition and asset link format', function () {
    // This test can't run on MKI because there is no way to create a stream definition document that doesn't match the
    // currently valid format. The test is designed to verify that the migration logic is working correctly.
    this.tags(['failsOnMKI']);
    before(async () => {
      await loadDashboards(kibanaServer, ARCHIVES, SPACE_ID);
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      // link and unlink dashboard to make sure assets index is created
      await apiClient.fetch('PUT /api/streams/{name}/dashboards/{dashboardId} 2023-10-31', {
        params: {
          path: {
            name: 'logs',
            dashboardId: TEST_DASHBOARD_ID,
          },
        },
      });
      await apiClient.fetch('DELETE /api/streams/{name}/dashboards/{dashboardId} 2023-10-31', {
        params: {
          path: {
            name: 'logs',
            dashboardId: TEST_DASHBOARD_ID,
          },
        },
      });
      await esClient.index({
        index: '.kibana_streams-000001',
        id: TEST_STREAM_NAME,
        document: streamDefinition,
      });
      await Promise.all(
        assetLinks.map((link) =>
          esClient.index({
            index: '.kibana_streams_assets-000001',
            id: link['asset.uuid'],
            document: link,
          })
        )
      );

      // Refresh the index to make the document searchable
      await esClient.indices.refresh({ index: '.kibana_streams-000001' });
      await esClient.indices.refresh({ index: '.kibana_streams_assets-000001' });
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

    it('should read expected dashboards for classic stream', async () => {
      const response = await apiClient.fetch('GET /api/streams/{name}/dashboards 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });
      expect(response.status).to.eql(200);
      expect(response.body.dashboards).to.eql(expectedDashboardsResponse.dashboards);
    });

    it('should read expected queries for classic stream', async () => {
      const response = await apiClient.fetch('GET /api/streams/{name}/queries 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
        },
      });
      expect(response.status).to.eql(200);
      expect(response.body.queries).to.eql(expectedQueriesResponse.queries);
    });
  });
}
