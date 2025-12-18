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

        console.log(JSON.stringify(deletedSource, null, 2));
        expect(deletedSource.status).toBe(400);
      });
    });
  });
};
