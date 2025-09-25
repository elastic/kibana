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

  describe('Dashboard Migrations All Stats', () => {
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
    });

    it('should return 200 with empty array when no migrations exist', async () => {
      const response = await dashboardMigrationRoutes.allStats({});

      expect(response.body).toEqual([]);
    });

    it('should return 200 with stats for all migrations', async () => {
      const migration1Response = await dashboardMigrationRoutes.create({
        body: { name: 'Test Dashboard Migration 1' },
      });
      const migration1Id = migration1Response.body.migration_id;

      const migration2Response = await dashboardMigrationRoutes.create({
        body: { name: 'Test Dashboard Migration 2' },
      });
      const migration2Id = migration2Response.body.migration_id;

      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId: migration1Id,
        body: [defaultOriginalDashboardExports],
      });

      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId: migration2Id,
        body: [defaultOriginalDashboardExports],
      });

      const response = await dashboardMigrationRoutes.allStats({});

      expect(response.body).toHaveLength(2);

      const migration1Stats = response.body.find((stats) => stats.id === migration1Id);
      const migration2Stats = response.body.find((stats) => stats.id === migration2Id);

      expect(migration1Stats).toBeDefined();
      expect(migration2Stats).toBeDefined();

      expect(migration1Stats).toMatchObject(
        expect.objectContaining({
          id: migration1Id,
          name: 'Test Dashboard Migration 1',
          items: {
            total: 1,
            pending: 1,
            completed: 0,
            failed: 0,
            processing: 0,
          },
          status: 'ready',
          last_updated_at: expect.any(String),
          created_at: expect.any(String),
        })
      );

      expect(migration2Stats).toMatchObject(
        expect.objectContaining({
          id: migration2Id,
          name: 'Test Dashboard Migration 2',
          items: {
            total: 1,
            pending: 1,
            completed: 0,
            failed: 0,
            processing: 0,
          },
          status: 'ready',
          last_updated_at: expect.any(String),
          created_at: expect.any(String),
        })
      );
    });

    it('should return stats for migrations with different statuses', async () => {
      const migrationResponse = await dashboardMigrationRoutes.create({
        body: { name: 'Test Dashboard Migration' },
      });
      const migrationId = migrationResponse.body.migration_id;

      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [defaultOriginalDashboardExports],
      });

      const response = await dashboardMigrationRoutes.allStats({});

      expect(response.body).toHaveLength(1);

      const migrationStats = response.body[0];
      expect(migrationStats).toMatchObject(
        expect.objectContaining({
          id: migrationId,
          name: 'Test Dashboard Migration',
          items: {
            total: 1,
            pending: 1,
            completed: 0,
            failed: 0,
            processing: 0,
          },
          status: 'ready',
          last_updated_at: expect.any(String),
          created_at: expect.any(String),
        })
      );

      expect(migrationStats.items?.total).toBe(1);
      expect(migrationStats.items?.pending).toBe(1);
    });

    it('should return empty array after all migrations are deleted', async () => {
      const migrationResponse = await dashboardMigrationRoutes.create({
        body: { name: 'Test Dashboard Migration' },
      });
      const migrationId = migrationResponse.body.migration_id;

      let response = await dashboardMigrationRoutes.allStats({});
      expect(response.body).toHaveLength(0);

      await dashboardMigrationRoutes.get({
        migrationId,
        expectStatusCode: 200,
      });

      response = await dashboardMigrationRoutes.allStats({});
      expect(response.body).toEqual([]);
    });
  });
};
