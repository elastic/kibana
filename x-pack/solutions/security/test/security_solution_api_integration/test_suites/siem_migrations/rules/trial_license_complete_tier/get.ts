/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { deleteAllRuleMigrations, ruleMigrationRouteHelpersFactory } from '../../utils';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);

  describe('@ess @serverless @serverlessQA Get API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
      const creationResponse = await ruleMigrationRoutes.create({});
      migrationId = creationResponse.body.migration_id;
    });

    it('should fetch existing migration', async () => {
      const migrationResponse = await ruleMigrationRoutes.get({
        migrationId,
      });

      expect(migrationResponse.body.id).toBe(migrationId);
    });

    describe('Error handling', () => {
      it('should return 404 if migration ID does not exist', async () => {
        const { body } = await ruleMigrationRoutes.get({
          migrationId: 'non-existing-migration-id',
          expectStatusCode: 404,
        });

        expect(body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          message: 'No Migration found with id: non-existing-migration-id',
        });
      });
    });
  });
};
