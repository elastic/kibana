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

  describe('Dashboard Migrations Translation Stats', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should return 200 with translation stats for a migration', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [defaultOriginalDashboardExports],
      });

      const response = await dashboardMigrationRoutes.translationStats({
        migrationId,
      });

      expect(response.body).toMatchObject(
        expect.objectContaining({
          id: migrationId,
          dashboards: {
            total: 1,
            success: {
              total: 0,
              result: {
                full: 0,
                partial: 0,
                untranslatable: 0,
              },
              installable: 0,
            },
            failed: 0,
          },
        })
      );

      expect(response.body.dashboards?.total).toBe(1);
      expect(response.body.dashboards?.success?.total).toBe(0);
      expect(response.body.dashboards?.failed).toBe(0);
    });

    it('should return 200 with translation stats for multiple dashboards', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [defaultOriginalDashboardExports, defaultOriginalDashboardExports],
      });

      const response = await dashboardMigrationRoutes.translationStats({
        migrationId,
      });

      expect(response.body).toMatchObject(
        expect.objectContaining({
          id: migrationId,
          dashboards: {
            total: 2,
            success: {
              total: 0,
              result: {
                full: 0,
                partial: 0,
                untranslatable: 0,
              },
              installable: 0,
            },
            failed: 0,
          },
        })
      );

      expect(response.body.dashboards?.total).toBe(2);
    });

    it('should return 200 with translation stats for empty migration', async () => {
      await dashboardMigrationRoutes.translationStats({
        migrationId,
        expectStatusCode: 204,
      });
    });

    describe('Error handling', () => {
      it('should return 404 if migration does not exist', async () => {
        const response = await dashboardMigrationRoutes.translationStats({
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
