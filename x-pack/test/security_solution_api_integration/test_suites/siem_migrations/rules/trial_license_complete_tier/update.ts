/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { deleteAllRuleMigrations, ruleMigrationRouteHelpersFactory } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const ruleMigrationRoutes = ruleMigrationRouteHelpersFactory(supertest);
  describe('@ess @serverless @serverlessQA Update API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllRuleMigrations(es);
      const name = 'First Migration';
      const creationResponse = await ruleMigrationRoutes.create({ body: { name } });
      migrationId = creationResponse.body.migration_id;
    });

    it('should update migration name without any issues', async () => {
      const updatedName = 'Updated Migration Name';
      await ruleMigrationRoutes.update({
        migrationId,
        body: { name: updatedName },
      });

      const { body } = await ruleMigrationRoutes.get({
        migrationId,
      });

      expect(body.id).toBe(migrationId);
      expect(body.name).toBe(updatedName);
    });

    describe('Error handling', () => {
      it('should return 404 if migration ID does not exist', async () => {
        const { body } = await ruleMigrationRoutes.update({
          migrationId: 'non-existing-migration-id',
          body: { name: 'New Name' },
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
