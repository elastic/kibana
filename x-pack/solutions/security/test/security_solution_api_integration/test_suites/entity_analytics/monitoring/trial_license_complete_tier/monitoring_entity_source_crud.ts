/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type {
  CreateEntitySourceRequestBody,
  ListEntitySourcesRequestQuery,
  ListEntitySourcesResponse,
  MonitoringEntitySource,
  UpdateEntitySourceRequestBody,
} from '@kbn/security-solution-plugin/common/api/entity_analytics/monitoring/monitoring_entity_source/monitoring_entity_source.gen';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const privMonUtils = PrivMonUtils(getService);

  const typedListEntitySources = async ({ query }: { query: ListEntitySourcesRequestQuery }) => {
    const listResponse = await api.listEntitySources({
      query,
    });
    return { ...listResponse, body: listResponse.body as ListEntitySourcesResponse };
  };

  const getOktaSource = async () => {
    const {
      body: { sources },
    } = await typedListEntitySources({
      query: {
        name: '.entity_analytics.monitoring.sources.entityanalytics_okta-default',
      },
    });
    expect(sources.length).toBe(1);
    return sources[0];
  };

  describe('@ess @serverless @skipInServerlessMKI Monitoring Entity Source CRUD', () => {
    beforeEach(async () => {
      await privMonUtils.initPrivMonEngine();
    });

    afterEach(async () => {
      await api.deleteMonitoringEngine({ query: { data: true } });
    });

    describe('Create Entity Source', () => {
      it('should not allow managed sources to be created', async () => {
        const indexName = `test-managed-entity-source-${Date.now()}`;
        const entitySource = {
          type: 'index',
          name: `Test managed entity source ${indexName}`,
          managed: true,
          indexPattern: indexName,
          enabled: true,
          matchers: [
            {
              fields: ['user.role'],
              values: ['admin'],
            },
          ],
          filter: {},
        };

        const createResponse = await api.createEntitySource({
          body: entitySource as CreateEntitySourceRequestBody,
        });
        expect(createResponse.status).toBe(400);
      });

      it('should allow non-managed sources to be created', async () => {
        const indexName = `test-non-managed-entity-source-${Date.now()}`;
        const entitySource = {
          type: 'index',
          name: `Test non-managed entity source ${indexName}`,
          indexPattern: indexName,
          enabled: true,
          matchers: [
            {
              fields: ['user.role'],
              values: ['admin'],
            },
          ],
          filter: {},
        };

        const createResponse = await api.createEntitySource({
          body: entitySource as CreateEntitySourceRequestBody,
        });
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.id).toBeDefined();
        expect(createResponse.body.managed).toBe(false);

        // Clean up
        await api.deleteEntitySource({
          params: {
            id: createResponse.body.id,
          },
        });
      });

      it('should default managed to false when not provided', async () => {
        const indexName = `test-default-managed-entity-source-${Date.now()}`;
        const entitySource = {
          type: 'index',
          name: `Test default managed entity source ${indexName}`,
          indexPattern: indexName,
          enabled: true,
          matchers: [
            {
              fields: ['user.role'],
              values: ['admin'],
            },
          ],
          filter: {},
        };

        const createResponse = await api.createEntitySource({
          body: entitySource as CreateEntitySourceRequestBody,
        });
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.id).toBeDefined();
        expect(createResponse.body.managed).toBe(false);

        // Clean up
        await api.deleteEntitySource({
          params: {
            id: createResponse.body.id,
          },
        });
      });
    });

    describe('Update Entity Source', () => {
      it('should not allow the managed field to be updated ', async () => {
        const source = await getOktaSource();
        const updatedSource = await api.updateEntitySource({
          params: {
            id: source.id,
          },
          body: {
            managed: false,
          } as UpdateEntitySourceRequestBody,
        });
        expect(updatedSource.status).toBe(400);
      });

      it('should not allow the type field to be updated ', async () => {
        const source = await getOktaSource();
        const updatedSource = await api.updateEntitySource({
          params: {
            id: source.id,
          },
          body: {
            type: 'index',
          } as UpdateEntitySourceRequestBody,
        });
        expect(updatedSource.status).toBe(400);
      });

      it('should allow matchers to be changed on a managed source ', async () => {
        const source = await getOktaSource();
        const updatedSource = await api.updateEntitySource({
          params: {
            id: source.id,
          },
          body: {
            matchers: [
              {
                fields: ['user.name'],
                values: ['test'],
              },
            ],
          },
        });
        expect(updatedSource.status).toBe(200);
      });
    });

    describe('Delete Entity Source', () => {
      it('should not allow managed sources to be deleted ', async () => {
        const source = await getOktaSource();
        const deletedSource = await api.deleteEntitySource({
          params: {
            id: source.id,
          },
        });

        expect(deletedSource.status).toBe(400);
      });

      it('should allow non-managed sources to be deleted', async () => {
        const indexName = `test-monitoring-entity-source-${Date.now()}`;
        // Create a non-managed entity source
        const entitySource = {
          type: 'index',
          name: `Test non-managed entity source ${indexName}`,
          indexPattern: indexName,
          enabled: true,
          matchers: [
            {
              fields: ['user.role'],
              values: ['admin'],
            },
          ],
          filter: {},
        };

        const createResponse = await api.createEntitySource({
          body: entitySource as CreateEntitySourceRequestBody,
        });
        expect(createResponse.status).toBe(200);
        expect(createResponse.body.id).toBeDefined();

        const sourceId = createResponse.body.id;

        // Delete the non-managed source
        const deleteResponse = await api.deleteEntitySource({
          params: {
            id: sourceId,
          },
        });

        expect(deleteResponse.status).toBe(200);
        expect(deleteResponse.body.acknowledged).toBe(true);

        // Verify the source was deleted by trying to get it
        const listResponse = await typedListEntitySources({
          query: {
            name: entitySource.name,
          },
        });
        expect(listResponse.body.sources.length).toBe(0);
      });
    });

    describe('Get Entity Source', () => {
      it('should get a managed source by ID', async () => {
        const source = await getOktaSource();
        const getResponse = await api.getEntitySource({
          params: {
            id: source.id,
          },
        });

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.id).toBe(source.id);
        expect(getResponse.body.name).toBe(source.name);
        expect(getResponse.body.managed).toBe(true);
      });

      it('should get a non-managed source by ID', async () => {
        const indexName = `test-get-entity-source-${Date.now()}`;
        const entitySource = {
          type: 'index',
          name: `Test get entity source ${indexName}`,
          indexPattern: indexName,
          enabled: true,
          matchers: [
            {
              fields: ['user.role'],
              values: ['admin'],
            },
          ],
          filter: {},
        };

        const createResponse = await api.createEntitySource({
          body: entitySource as CreateEntitySourceRequestBody,
        });
        expect(createResponse.status).toBe(200);

        const getResponse = await api.getEntitySource({
          params: {
            id: createResponse.body.id,
          },
        });

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.id).toBe(createResponse.body.id);
        expect(getResponse.body.name).toBe(entitySource.name);
        expect(getResponse.body.managed).toBe(false);

        // Clean up
        await api.deleteEntitySource({
          params: {
            id: createResponse.body.id,
          },
        });
      });

      it('should return 404 for non-existent source', async () => {
        const getResponse = await api.getEntitySource({
          params: {
            id: 'non-existent-id',
          },
        });

        expect(getResponse.status).toBe(404);
      });
    });

    describe('List Entity Sources', () => {
      it('should list all entity sources', async () => {
        const listResponse = await typedListEntitySources({
          query: {},
        });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.sources).toBeDefined();
        expect(Array.isArray(listResponse.body.sources)).toBe(true);
        expect(listResponse.body.sources.length).toBeGreaterThan(0);
        expect(listResponse.body.page).toBeDefined();
        expect(listResponse.body.per_page).toBeDefined();
        expect(listResponse.body.total).toBeDefined();
        expect(listResponse.body.page).toBeGreaterThan(0);
        expect(listResponse.body.per_page).toBeGreaterThan(0);
        expect(listResponse.body.total).toBeGreaterThanOrEqual(0);
      });

      it('should filter sources by name', async () => {
        const source = await getOktaSource();
        const listResponse = await typedListEntitySources({
          query: {
            name: source.name,
          },
        });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.sources.length).toBe(1);
        expect(listResponse.body.sources[0].id).toBe(source.id);
        expect(listResponse.body.sources[0].name).toBe(source.name);
        expect(listResponse.body.total).toBe(1);
      });

      it('should filter sources by type', async () => {
        const listResponse = await typedListEntitySources({
          query: {
            type: 'index',
          },
        });

        expect(listResponse.status).toBe(200);
        expect(Array.isArray(listResponse.body.sources)).toBe(true);
        listResponse.body.sources.forEach((source: MonitoringEntitySource) => {
          expect(source.type).toBe('index');
        });
      });

      it('should filter sources by managed status', async () => {
        const managedListResponse = await typedListEntitySources({
          query: {
            managed: true,
          },
        });

        expect(managedListResponse.status).toBe(200);
        expect(Array.isArray(managedListResponse.body.sources)).toBe(true);
        managedListResponse.body.sources.forEach((source: MonitoringEntitySource) => {
          expect(source.managed).toBe(true);
        });

        const nonManagedListResponse = await typedListEntitySources({
          query: {
            managed: false,
          },
        });

        expect(nonManagedListResponse.status).toBe(200);
        expect(Array.isArray(nonManagedListResponse.body.sources)).toBe(true);
        nonManagedListResponse.body.sources.forEach((source: MonitoringEntitySource) => {
          expect(source.managed).toBe(false);
        });
      });

      it('should return empty array when no sources match filter', async () => {
        const listResponse = await typedListEntitySources({
          query: {
            name: 'non-existent-source-name-12345',
          },
        });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.sources.length).toBe(0);
        expect(listResponse.body.total).toBe(0);
      });

      it('should support pagination with page and per_page', async () => {
        // Get all sources first to know the total
        const allSourcesResponse = await typedListEntitySources({
          query: {},
        });
        const totalSources = allSourcesResponse.body.total;

        if (totalSources > 0) {
          // Test first page with per_page = 1
          const firstPageResponse = await typedListEntitySources({
            query: {
              page: 1,
              per_page: 1,
            },
          });

          expect(firstPageResponse.status).toBe(200);
          expect(firstPageResponse.body.page).toBe(1);
          expect(firstPageResponse.body.per_page).toBe(1);
          expect(firstPageResponse.body.total).toBe(totalSources);
          expect(firstPageResponse.body.sources.length).toBe(1);

          // Test second page if there are more sources
          if (totalSources > 1) {
            const secondPageResponse = await typedListEntitySources({
              query: {
                page: 2,
                per_page: 1,
              },
            });

            expect(secondPageResponse.status).toBe(200);
            expect(secondPageResponse.body.page).toBe(2);
            expect(secondPageResponse.body.per_page).toBe(1);
            expect(secondPageResponse.body.total).toBe(totalSources);
            expect(secondPageResponse.body.sources.length).toBe(1);
            // Verify different sources on different pages
            expect(secondPageResponse.body.sources[0].id).not.toBe(
              firstPageResponse.body.sources[0].id
            );
          }
        }
      });

      it('should support sorting by sort_field and sort_order', async () => {
        const listResponse = await typedListEntitySources({
          query: {
            sort_field: 'name',
            sort_order: 'asc',
          },
        });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.sources.length).toBeGreaterThan(0);

        // Verify sources are sorted by name in ascending order
        for (let i = 1; i < listResponse.body.sources.length; i++) {
          expect(listResponse.body.sources[i].name >= listResponse.body.sources[i - 1].name).toBe(
            true
          );
        }

        // Test descending order
        const descListResponse = await typedListEntitySources({
          query: {
            sort_field: 'name',
            sort_order: 'desc',
          },
        });

        expect(descListResponse.status).toBe(200);
        expect(descListResponse.body.sources.length).toBeGreaterThan(0);

        // Verify sources are sorted by name in descending order
        for (let i = 1; i < descListResponse.body.sources.length; i++) {
          expect(
            descListResponse.body.sources[i].name <= descListResponse.body.sources[i - 1].name
          ).toBe(true);
        }
      });

      it('should combine pagination and sorting', async () => {
        const allSourcesResponse = await typedListEntitySources({
          query: {
            sort_field: 'name',
            sort_order: 'asc',
          },
        });
        const totalSources = allSourcesResponse.body.total;

        if (totalSources > 1) {
          const firstPageResponse = await typedListEntitySources({
            query: {
              page: 1,
              per_page: 1,
              sort_field: 'name',
              sort_order: 'asc',
            },
          });

          expect(firstPageResponse.status).toBe(200);
          expect(firstPageResponse.body.page).toBe(1);
          expect(firstPageResponse.body.per_page).toBe(1);
          expect(firstPageResponse.body.total).toBe(totalSources);
          expect(firstPageResponse.body.sources.length).toBe(1);

          // The first page should have the first item when sorted by name ascending
          expect(firstPageResponse.body.sources[0].name).toBe(
            allSourcesResponse.body.sources[0].name
          );
        }
      });
    });
  });
};
