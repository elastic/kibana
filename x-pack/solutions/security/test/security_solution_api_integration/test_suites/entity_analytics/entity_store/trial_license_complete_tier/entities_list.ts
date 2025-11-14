/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const entityAnalyticsApi = getService('entityAnalyticsApi');

  describe('@ess @skipInServerlessMKI Entity store - Entities list API', () => {
    describe('when the entity store is disable', () => {
      it("should return response with success status when the index doesn't exist", async () => {
        const { body } = await entityAnalyticsApi.listEntities({
          query: { entity_types: ['host'] },
        });

        expect(body).toEqual(
          expect.objectContaining({
            total: 0,
            records: [],
          })
        );
      });
    });

    describe('when the entity store is enable', () => {
      const esArchiver = getService('esArchiver');

      before(async () => {
        await esArchiver.load(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/entity_store'
        );
      });

      after(async () => {
        await esArchiver.unload(
          'x-pack/solutions/security/test/fixtures/es_archives/security_solution/entity_store'
        );
      });

      it('should return hosts from the entity store index', async () => {
        const { body } = await entityAnalyticsApi.listEntities({
          query: { entity_types: ['host'] },
        });

        expect(body.total).toEqual(1);
        expect(body.records.length).toEqual(1);
      });

      it('should return users from the entity store index', async () => {
        const { body } = await entityAnalyticsApi.listEntities({
          query: { entity_types: ['user'] },
        });

        expect(body.total).toEqual(1);
        expect(body.records.length).toEqual(1);
      });

      it('should return services from the entity store index', async () => {
        const { body } = await entityAnalyticsApi.listEntities({
          query: { entity_types: ['service'] },
        });

        expect(body.total).toEqual(1);
        expect(body.records.length).toEqual(1);
      });

      it('should return two entity types from the entity store index', async () => {
        const { body } = await entityAnalyticsApi.listEntities({
          query: { entity_types: ['user', 'host'] },
        });

        expect(body.total).toEqual(2);
        expect(body.records.length).toEqual(2);
      });
    });
  });
};
