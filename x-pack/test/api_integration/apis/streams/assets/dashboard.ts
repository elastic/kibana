/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { disableStreams, enableStreams, indexDocument } from '../helpers/requests';
import { createStreamsRepositorySupertestClient } from '../helpers/repository_client';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esClient = getService('es');

  const kibanaServer = getService('kibanaServer');

  const apiClient = createStreamsRepositorySupertestClient(supertest);

  const SPACE_ID = 'default';
  const ARCHIVES = [
    'test/api_integration/fixtures/kbn_archiver/saved_objects/search.json',
    'test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
  ];

  const SEARCH_DASHBOARD_ID = 'b70c7ae0-3224-11e8-a572-ffca06da1357';
  const BASIC_DASHBOARD_ID = 'be3733a0-9efe-11e7-acb3-3dab96693fab';
  const BASIC_DASHBOARD_TITLE = 'Requests';

  async function loadDashboards() {
    for (const archive of ARCHIVES) {
      await kibanaServer.importExport.load(archive, { space: SPACE_ID });
    }
  }

  async function unloadDashboards() {
    for (const archive of ARCHIVES) {
      await kibanaServer.importExport.unload(archive, { space: SPACE_ID });
    }
  }

  async function linkDashboard(id: string) {
    const response = await apiClient.fetch('PUT /api/streams/{id}/dashboards/{dashboardId}', {
      params: { path: { id: 'logs', dashboardId: id } },
    });

    expect(response.status).to.be(200);
  }

  async function unlinkDashboard(id: string) {
    const response = await apiClient.fetch('DELETE /api/streams/{id}/dashboards/{dashboardId}', {
      params: { path: { id: 'logs', dashboardId: id } },
    });

    expect(response.status).to.be(200);
  }

  async function bulkLinkDashboard(...ids: string[]) {
    const response = await apiClient.fetch('POST /api/streams/{id}/dashboards/_bulk', {
      params: {
        path: { id: 'logs' },
        body: {
          operations: ids.map((id) => {
            return {
              index: {
                id,
              },
            };
          }),
        },
      },
    });

    expect(response.status).to.be(200);
  }

  async function bulkUnlinkDashboard(...ids: string[]) {
    const response = await apiClient.fetch('POST /api/streams/{id}/dashboards/_bulk', {
      params: {
        path: { id: 'logs' },
        body: {
          operations: ids.map((id) => {
            return {
              delete: {
                id,
              },
            };
          }),
        },
      },
    });

    expect(response.status).to.be(200);
  }

  async function deleteAssetIndices() {
    const concreteIndices = await esClient.indices.resolveIndex({
      name: '.kibana_streams_assets*',
    });

    if (concreteIndices.indices.length) {
      await esClient.indices.delete({
        index: concreteIndices.indices.map((index) => index.name),
      });
    }
  }

  describe('Asset links', () => {
    before(async () => {
      await enableStreams(apiClient);

      await indexDocument(esClient, 'logs', {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
      });
    });

    after(async () => {
      await disableStreams(apiClient);

      await deleteAssetIndices();
    });

    describe('without writing', () => {
      it('creates no indices initially', async () => {
        const exists = await esClient.indices.exists({ index: '.kibana_streams_assets' });

        expect(exists).to.eql(false);
      });

      it('creates no indices after reading the assets', async () => {
        const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
          params: { path: { id: 'logs' } },
        });

        expect(response.status).to.be(200);

        const exists = await esClient.indices.exists({ index: '.kibana_streams_assets' });

        expect(exists).to.eql(false);
      });
    });

    describe('after linking a dashboard', () => {
      before(async () => {
        await loadDashboards();

        await linkDashboard(SEARCH_DASHBOARD_ID);
      });

      after(async () => {
        await unloadDashboards();
        await unlinkDashboard(SEARCH_DASHBOARD_ID);
      });

      it('creates the index', async () => {
        const exists = await esClient.indices.exists({ index: '.kibana_streams_assets' });

        expect(exists).to.be(true);
      });

      it('lists the dashboard in the stream response', async () => {
        const response = await apiClient.fetch('GET /api/streams/{id}', {
          params: { path: { id: 'logs' } },
        });

        expect(response.status).to.eql(200);

        expect(response.body.dashboards?.length).to.eql(1);
      });

      it('lists the dashboard in the dashboards get response', async () => {
        const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
          params: { path: { id: 'logs' } },
        });

        expect(response.status).to.eql(200);

        expect(response.body.dashboards.length).to.eql(1);
      });

      describe('after manually rolling over the index and relinking the dashboard', () => {
        before(async () => {
          await esClient.indices.updateAliases({
            actions: [
              {
                add: {
                  index: `.kibana_streams_assets-000001`,
                  alias: `.kibana_streams_assets`,
                  is_write_index: false,
                },
              },
            ],
          });

          await esClient.indices.create({
            index: `.kibana_streams_assets-000002`,
          });

          await unlinkDashboard(SEARCH_DASHBOARD_ID);
          await linkDashboard(SEARCH_DASHBOARD_ID);
        });

        it('there are no duplicates', async () => {
          const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
            params: { path: { id: 'logs' } },
          });

          expect(response.status).to.eql(200);

          expect(response.body.dashboards.length).to.eql(1);

          const esResponse = await esClient.search({
            index: `.kibana_streams_assets`,
          });

          expect(esResponse.hits.hits.length).to.eql(1);
        });
      });

      describe('after deleting the indices and relinking the dashboard', () => {
        before(async () => {
          await deleteAssetIndices();

          await unlinkDashboard(SEARCH_DASHBOARD_ID);
          await linkDashboard(SEARCH_DASHBOARD_ID);
        });

        it('recovers on write and lists the linked dashboard ', async () => {
          const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
            params: { path: { id: 'logs' } },
          });

          expect(response.status).to.eql(200);

          expect(response.body.dashboards.length).to.eql(1);
        });
      });

      describe('after deleting the dashboards', () => {
        before(async () => {
          await unloadDashboards();
        });

        it('no longer lists the dashboard as a linked asset', async () => {
          const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
            params: { path: { id: 'logs' } },
          });

          expect(response.status).to.eql(200);

          expect(response.body.dashboards.length).to.eql(0);
        });
      });
    });

    describe('after using the bulk API', () => {
      before(async () => {
        await loadDashboards();

        await bulkLinkDashboard(SEARCH_DASHBOARD_ID, BASIC_DASHBOARD_ID);
      });

      after(async () => {
        await bulkUnlinkDashboard(SEARCH_DASHBOARD_ID, BASIC_DASHBOARD_ID);
        await unloadDashboards();
      });

      it('shows the linked dashboards', async () => {
        const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
          params: { path: { id: 'logs' } },
        });

        expect(response.body.dashboards.length).to.eql(2);
      });

      describe('after unlinking one dashboard', () => {
        before(async () => {
          await bulkUnlinkDashboard(SEARCH_DASHBOARD_ID);
        });

        it('only shows the remaining linked dashboard', async () => {
          const response = await apiClient.fetch('GET /api/streams/{id}/dashboards', {
            params: { path: { id: 'logs' } },
          });

          expect(response.body.dashboards.length).to.eql(1);

          expect(response.body.dashboards[0].id).to.eql(BASIC_DASHBOARD_ID);
        });
      });
    });

    describe('suggestions', () => {
      before(async () => {
        await loadDashboards();

        await linkDashboard(SEARCH_DASHBOARD_ID);
      });

      after(async () => {
        await unlinkDashboard(SEARCH_DASHBOARD_ID);
        await unloadDashboards();
      });

      describe('after creating multiple dashboards', () => {
        it('suggests dashboards to link', async () => {
          const response = await apiClient.fetch('POST /api/streams/{id}/dashboards/_suggestions', {
            params: { path: { id: 'logs' }, body: { tags: [] }, query: { query: '' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.suggestions.length).to.eql(2);
        });

        // TODO: needs a dataset with dashboards with tags
        it.skip('filters suggested dashboards based on tags', () => {});

        it('filters suggested dashboards based on the query', async () => {
          const response = await apiClient.fetch('POST /api/streams/{id}/dashboards/_suggestions', {
            params: {
              path: { id: 'logs' },
              body: { tags: [] },
              query: { query: BASIC_DASHBOARD_TITLE },
            },
          });

          expect(response.status).to.eql(200);
          expect(response.body.suggestions.length).to.eql(1);

          expect(response.body.suggestions[0].id).to.eql(BASIC_DASHBOARD_ID);
        });
      });
    });
  });
}
