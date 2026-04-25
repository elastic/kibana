/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { dashboardMigrationRouteFactory } from '../../../utils/dashboards';
import { deleteAllDashboardMigrations } from '../../../utils/es_queries_dashboards';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Dashboard Migration Update API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({ body: { name: 'initial name' } });
      migrationId = response.body.migration_id;
    });

    it('should update a dashboard migration successfully', async () => {
      await dashboardMigrationRoutes.update({
        migrationId,
        body: { name: 'updated name' },
      });

      const getResponse = await dashboardMigrationRoutes.get({ migrationId });
      expect(getResponse.body).toMatchObject({
        name: 'updated name',
      });
    });

    describe('Error handling', () => {
      it('should return 404 if migration does not exist', async () => {
        const response = await dashboardMigrationRoutes.update({
          migrationId: 'non-existent-migration',
          body: { name: 'anything' },
          expectStatusCode: 404,
        });

        expect(response.body).toMatchObject({
          message: 'No Migration found with id: non-existent-migration',
        });
      });

      it('should return 400 for invalid payload', async () => {
        const response = await dashboardMigrationRoutes.update({
          migrationId,
          // @ts-expect-error sending invalid field to trigger validation error
          body: { invalidField: 123 },
          expectStatusCode: 400,
        });
        expect(response.body).toBeDefined();
      });
    });
  });
};
