/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { defaultOriginalDashboardExports } from '../../../utils/dashboard_mocks';
import { dashboardMigrationRouteFactory } from '../../../utils/dashboards';
import { deleteAllDashboardMigrations } from '../../../utils/es_queries_dashboards';
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('Dashboard Migrations Stats', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should return 200 with stats for a migration', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [defaultOriginalDashboardExports],
      });

      const response = await dashboardMigrationRoutes.stats({
        migrationId,
      });

      expect(response.body).toMatchObject(
        expect.objectContaining({
          id: migrationId,
          items: {
            total: 1,
            pending: 1,
            completed: 0,
            failed: 0,
            processing: 0,
          },
          status: 'ready',
          name: 'Test Dashboard Migration',
          last_updated_at: expect.any(String),
          created_at: expect.any(String),
        })
      );

      expect(response.body.items?.total).toBe(1);
      expect(response.body.items?.pending).toBe(1);
    });

    describe('Error handling', () => {
      it('should return 404 if migration does not exist', async () => {
        const response = await dashboardMigrationRoutes.stats({
          migrationId: 'non-existent-migration',
          expectStatusCode: 404,
        });

        expect(response.body).toMatchObject({
          message: 'No Migration found with id: non-existent-migration',
        });
      });
    });
  });
};
