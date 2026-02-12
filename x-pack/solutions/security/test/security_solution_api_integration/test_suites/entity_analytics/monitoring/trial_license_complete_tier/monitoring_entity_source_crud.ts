/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { sortBy } from 'lodash';
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
    const listResponse = await api.listEntitySources({ query });
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

  const defaultMatchers = [
    {
      fields: ['user.role'],
      values: ['admin'],
    },
  ];

  const createEntitySource = async (
    overrides: Partial<CreateEntitySourceRequestBody> = {}
  ): Promise<MonitoringEntitySource> => {
    const indexName = `test-entity-source-${Date.now()}`;
    const entitySource: CreateEntitySourceRequestBody = {
      type: 'index',
      name: `Test entity source ${indexName}`,
      indexPattern: indexName,
      enabled: true,
      matchers: defaultMatchers,
      filter: {},
      ...overrides,
    } as CreateEntitySourceRequestBody;

    const { body } = await api.createEntitySource({ body: entitySource });
    return body;
  };

  const deleteEntitySource = async (id: string) => {
    await api.deleteEntitySource({ params: { id } });
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
        const { status } = await api.createEntitySource({
          body: {
            type: 'index',
            name: `Test managed entity source ${Date.now()}`,
            managed: true,
            indexPattern: `test-managed-${Date.now()}`,
            enabled: true,
            matchers: defaultMatchers,
            filter: {},
          } as CreateEntitySourceRequestBody,
        });
        expect(status).toBe(400);
      });

      it('should allow non-managed sources to be created', async () => {
        const { status, body } = await api.createEntitySource({
          body: {
            type: 'index',
            name: `Test non-managed entity source ${Date.now()}`,
            indexPattern: `test-non-managed-${Date.now()}`,
            enabled: true,
            matchers: defaultMatchers,
            filter: {},
          } as CreateEntitySourceRequestBody,
        });

        expect(status).toBe(200);
        expect(body.id).toBeDefined();
        expect(body.managed).toBe(false);

        await deleteEntitySource(body.id);
      });

      it('should default managed to false when not provided', async () => {
        const { status, body } = await api.createEntitySource({
          body: {
            type: 'index',
            name: `Test default managed entity source ${Date.now()}`,
            indexPattern: `test-default-${Date.now()}`,
            enabled: true,
            matchers: defaultMatchers,
            filter: {},
          } as CreateEntitySourceRequestBody,
        });

        expect(status).toBe(200);
        expect(body.id).toBeDefined();
        expect(body.managed).toBe(false);

        await deleteEntitySource(body.id);
      });

      it('should not allow integration type sources to be created', async () => {
        const { status } = await api.createEntitySource({
          body: {
            type: 'entity_analytics_integration',
            name: `Test integration entity source ${Date.now()}`,
            indexPattern: `test-integration-${Date.now()}`,
            enabled: true,
            matchers: defaultMatchers,
            filter: {},
          } as CreateEntitySourceRequestBody,
        });
        expect(status).toBe(400);
      });
    });

    describe('Update Entity Source', () => {
      it('should not allow the managed field to be updated ', async () => {
        const { id } = await getOktaSource();
        const { status } = await api.updateEntitySource({
          params: { id },
          body: { managed: false } as UpdateEntitySourceRequestBody,
        });
        expect(status).toBe(400);
      });

      it('should not allow the type field to be updated ', async () => {
        const { id } = await getOktaSource();
        const { status } = await api.updateEntitySource({
          params: { id },
          body: { type: 'index' } as UpdateEntitySourceRequestBody,
        });
        expect(status).toBe(400);
      });

      it('should allow matchers to be changed on a managed source ', async () => {
        const { id } = await getOktaSource();
        const { status } = await api.updateEntitySource({
          params: { id },
          body: {
            matchers: [
              {
                fields: ['user.name'],
                values: ['test'],
              },
            ],
          },
        });
        expect(status).toBe(200);
      });
    });

    describe('Delete Entity Source', () => {
      it('should not allow managed sources to be deleted ', async () => {
        const { id } = await getOktaSource();
        const { status } = await api.deleteEntitySource({
          params: { id },
        });

        expect(status).toBe(400);
      });

      it('should allow non-managed sources to be deleted', async () => {
        const { id, name } = await createEntitySource();

        const { status, body } = await api.deleteEntitySource({
          params: { id },
        });

        expect(status).toBe(200);
        expect(body.acknowledged).toBe(true);

        // Verify the source was deleted
        const {
          body: { sources },
        } = await typedListEntitySources({
          query: { name },
        });
        expect(sources.length).toBe(0);
      });

      it('should return 404 for non-existent source', async () => {
        const { status } = await api.deleteEntitySource({
          params: { id: 'non-existent-id' },
        });

        expect(status).toBe(404);
      });
    });

    describe('Get Entity Source', () => {
      it('should get a managed source by ID', async () => {
        const source = await getOktaSource();
        const { status, body } = await api.getEntitySource({
          params: { id: source.id },
        });

        expect(status).toBe(200);
        expect(body.id).toBe(source.id);
        expect(body.name).toBe(source.name);
        expect(body.managed).toBe(true);
      });

      it('should get a non-managed source by ID', async () => {
        const { id, name } = await createEntitySource();

        const { status, body } = await api.getEntitySource({
          params: { id },
        });

        expect(status).toBe(200);
        expect(body.id).toBe(id);
        expect(body.name).toBe(name);
        expect(body.managed).toBe(false);

        await deleteEntitySource(id);
      });

      it('should return 404 for non-existent source', async () => {
        const { status } = await api.getEntitySource({
          params: { id: 'non-existent-id' },
        });

        expect(status).toBe(404);
      });
    });

    describe('List Entity Sources', () => {
      it('should list all entity sources', async () => {
        const { status, body } = await typedListEntitySources({ query: {} });

        expect(status).toBe(200);
        expect(body.sources).toBeDefined();
        expect(Array.isArray(body.sources)).toBe(true);
        expect(body.sources.length).toBeGreaterThan(0);
        expect(body.page).toBeDefined();
        expect(body.per_page).toBeDefined();
        expect(body.total).toBeDefined();
        expect(body.page).toBeGreaterThan(0);
        expect(body.per_page).toBeGreaterThan(0);
        expect(body.total).toBeGreaterThanOrEqual(0);
      });

      it('should filter sources by name', async () => {
        const source = await getOktaSource();
        const {
          status,
          body: { sources, total },
        } = await typedListEntitySources({
          query: { name: source.name },
        });

        expect(status).toBe(200);
        expect(sources.length).toBe(1);
        expect(sources[0].id).toBe(source.id);
        expect(sources[0].name).toBe(source.name);
        expect(total).toBe(1);
      });

      it('should filter sources by type', async () => {
        const {
          status,
          body: { sources },
        } = await typedListEntitySources({
          query: { type: 'index' },
        });

        expect(status).toBe(200);
        expect(Array.isArray(sources)).toBe(true);
        sources.forEach((source: MonitoringEntitySource) => {
          expect(source.type).toBe('index');
        });
      });

      it('should filter sources by managed status', async () => {
        const {
          status: managedStatus,
          body: { sources: managedSources },
        } = await typedListEntitySources({
          query: { managed: true },
        });

        expect(managedStatus).toBe(200);
        expect(Array.isArray(managedSources)).toBe(true);
        managedSources.forEach((source: MonitoringEntitySource) => {
          expect(source.managed).toBe(true);
        });

        const {
          status: nonManagedStatus,
          body: { sources: nonManagedSources },
        } = await typedListEntitySources({
          query: { managed: false },
        });

        expect(nonManagedStatus).toBe(200);
        expect(Array.isArray(nonManagedSources)).toBe(true);
        nonManagedSources.forEach((source: MonitoringEntitySource) => {
          expect(source.managed).toBe(false);
        });
      });

      it('should return empty array when no sources match filter', async () => {
        const {
          status,
          body: { sources, total },
        } = await typedListEntitySources({
          query: { name: 'non-existent-source-name-12345' },
        });

        expect(status).toBe(200);
        expect(sources.length).toBe(0);
        expect(total).toBe(0);
      });

      it('should support pagination with page and per_page', async () => {
        const {
          body: { total: totalSources },
        } = await typedListEntitySources({ query: {} });

        if (totalSources > 0) {
          const {
            status: firstStatus,
            body: {
              page: firstPage,
              per_page: firstPerPage,
              total: firstTotal,
              sources: firstSources,
            },
          } = await typedListEntitySources({
            query: { page: 1, per_page: 1 },
          });

          expect(firstStatus).toBe(200);
          expect(firstPage).toBe(1);
          expect(firstPerPage).toBe(1);
          expect(firstTotal).toBe(totalSources);
          expect(firstSources.length).toBe(1);

          if (totalSources > 1) {
            const {
              status: secondStatus,
              body: {
                page: secondPage,
                per_page: secondPerPage,
                total: secondTotal,
                sources: secondSources,
              },
            } = await typedListEntitySources({
              query: { page: 2, per_page: 1 },
            });

            expect(secondStatus).toBe(200);
            expect(secondPage).toBe(2);
            expect(secondPerPage).toBe(1);
            expect(secondTotal).toBe(totalSources);
            expect(secondSources.length).toBe(1);
            expect(secondSources[0].id).not.toBe(firstSources[0].id);
          }
        }
      });

      it('should support sorting by sort_field and sort_order', async () => {
        // Get all sources without sorting to create expected sorted lists
        const {
          body: { sources: allSources },
        } = await typedListEntitySources({
          query: {},
        });

        expect(allSources.length).toBeGreaterThan(0);

        // Create expected ascending sorted list
        const expectedAscSorted = sortBy(allSources, (source) => source.name ?? '');

        // Test ascending order
        const {
          status: ascStatus,
          body: { sources: ascSources },
        } = await typedListEntitySources({
          query: { sort_field: 'name', sort_order: 'asc' },
        });

        expect(ascStatus).toBe(200);
        expect(ascSources.length).toBe(allSources.length);
        expect(ascSources).toEqual(expectedAscSorted);

        // Create expected descending sorted list
        const expectedDescSorted = sortBy(allSources, (source) => source.name ?? '').reverse();

        // Test descending order
        const {
          status: descStatus,
          body: { sources: descSources },
        } = await typedListEntitySources({
          query: { sort_field: 'name', sort_order: 'desc' },
        });

        expect(descStatus).toBe(200);
        expect(descSources.length).toBe(allSources.length);
        expect(descSources).toEqual(expectedDescSorted);
      });

      it('should combine pagination and sorting', async () => {
        const {
          body: { total: totalSources, sources: allSources },
        } = await typedListEntitySources({
          query: { sort_field: 'name', sort_order: 'asc' },
        });

        if (totalSources > 1) {
          const {
            status,
            body: { page, per_page, total, sources },
          } = await typedListEntitySources({
            query: { page: 1, per_page: 1, sort_field: 'name', sort_order: 'asc' },
          });

          expect(status).toBe(200);
          expect(page).toBe(1);
          expect(per_page).toBe(1);
          expect(total).toBe(totalSources);
          expect(sources.length).toBe(1);
          expect(sources[0].name).toBe(allSources[0].name);
        }
      });
    });
  });
};
