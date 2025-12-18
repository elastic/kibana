/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('entityAnalyticsApi');
  const kibanaServer = getService('kibanaServer');
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const privMonUtils = PrivMonUtils(getService);

  const getOktaSource = async () => {
    const sources = await api.listEntitySources({
      query: {
        name: '.entity_analytics.monitoring.sources.entityanalytics_okta-default',
      },
    });
    expect(sources.body.length).toBe(1);
    return sources.body[0];
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

        const createResponse = await api.createEntitySource({ body: entitySource });
        expect(createResponse.status).toBe(400);
        expect(createResponse.body.message).toBe('Cannot create managed entity source');
      });

      it('should allow non-managed sources to be created', async () => {
        const indexName = `test-non-managed-entity-source-${Date.now()}`;
        const entitySource = {
          type: 'index',
          name: `Test non-managed entity source ${indexName}`,
          managed: false,
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

        const createResponse = await api.createEntitySource({ body: entitySource });
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

        const createResponse = await api.createEntitySource({ body: entitySource });
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
          },
        });
        expect(updatedSource.status).toBe(400);
      });

      it('should not allow the type field to be updated ', async () => {
        const source = await getOktaSource();
        const updatedSource = await api.updateEntitySource({
          params: {
            id: source.id,
          },
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
          managed: false,
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

        const createResponse = await api.createEntitySource({ body: entitySource });
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
        const listResponse = await api.listEntitySources({
          query: {
            name: entitySource.name,
          },
        });
        expect(listResponse.body.length).toBe(0);
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
          managed: false,
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

        const createResponse = await api.createEntitySource({ body: entitySource });
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
        const listResponse = await api.listEntitySources({
          query: {},
        });

        expect(listResponse.status).toBe(200);
        expect(Array.isArray(listResponse.body)).toBe(true);
        expect(listResponse.body.length).toBeGreaterThan(0);
      });

      it('should filter sources by name', async () => {
        const source = await getOktaSource();
        const listResponse = await api.listEntitySources({
          query: {
            name: source.name,
          },
        });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.length).toBe(1);
        expect(listResponse.body[0].id).toBe(source.id);
        expect(listResponse.body[0].name).toBe(source.name);
      });

      it('should filter sources by type', async () => {
        const listResponse = await api.listEntitySources({
          query: {
            type: 'index',
          },
        });

        expect(listResponse.status).toBe(200);
        expect(Array.isArray(listResponse.body)).toBe(true);
        listResponse.body.forEach((source) => {
          expect(source.type).toBe('index');
        });
      });

      it('should filter sources by managed status', async () => {
        const managedListResponse = await api.listEntitySources({
          query: {
            managed: true,
          },
        });

        expect(managedListResponse.status).toBe(200);
        expect(Array.isArray(managedListResponse.body)).toBe(true);
        managedListResponse.body.forEach((source) => {
          expect(source.managed).toBe(true);
        });

        const nonManagedListResponse = await api.listEntitySources({
          query: {
            managed: false,
          },
        });

        expect(nonManagedListResponse.status).toBe(200);
        expect(Array.isArray(nonManagedListResponse.body)).toBe(true);
        nonManagedListResponse.body.forEach((source) => {
          expect(source.managed).toBe(false);
        });
      });

      it('should return empty array when no sources match filter', async () => {
        const listResponse = await api.listEntitySources({
          query: {
            name: 'non-existent-source-name-12345',
          },
        });

        expect(listResponse.status).toBe(200);
        expect(listResponse.body.length).toBe(0);
      });
    });
  });
};
