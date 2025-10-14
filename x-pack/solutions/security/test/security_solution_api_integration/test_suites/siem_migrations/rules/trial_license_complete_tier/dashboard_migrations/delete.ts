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
import {
  DASHBOARD_MIGRATIONS_RESOURCES_INDEX_PATTERN,
  deleteAllDashboardMigrations,
} from '../../../utils/es_queries_dashboards';
import { getResoucesPerMigrationFromES } from '../../../utils/es_queries';
import { createMacrosForMigrationId, executeTaskInBatches } from '../../../utils';
export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('Dashboard Migrations Delete API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should be able to delete an existing migration', async () => {
      // adding 5K records in total make sure that size parameter is not a problem when handling deletion
      await executeTaskInBatches({
        items: Array.from({ length: 5000 }, () => defaultOriginalDashboardExports),
        batchSize: 1000,
        executor: async (batch) => {
          await dashboardMigrationRoutes.addDashboardsToMigration({
            migrationId,
            body: batch,
          });
        },
      });

      await createMacrosForMigrationId({
        es,
        migrationId,
        count: 10000,
        index: DASHBOARD_MIGRATIONS_RESOURCES_INDEX_PATTERN,
      });

      const statsResponseBeforeDelete = await dashboardMigrationRoutes.stats({
        migrationId,
      });

      expect(statsResponseBeforeDelete.body.items.total).toEqual(5_000);

      await dashboardMigrationRoutes.delete({
        migrationId,
      });

      await dashboardMigrationRoutes.stats({
        migrationId,
        expectStatusCode: 404,
      });

      const resourcesFromES = await getResoucesPerMigrationFromES({
        es,
        migrationId,
      });

      expect(resourcesFromES.hits.hits).toHaveLength(0);
    });

    describe('Error handling', () => {
      it('should return 404 if migration does not exist', async () => {
        const response = await dashboardMigrationRoutes.delete({
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
