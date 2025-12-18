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

    describe('Create Entity Source', () => {});

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

    describe.only('Delete Entity Source', () => {
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
  });
};
