/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import {
  expectedSentinelWorkbookWatchlists,
  sentinelArmResourcesWithWorkbook,
} from '../../../../utils/mocks';
import {
  deleteAllDashboardMigrations,
  getDashboardsPerMigrationFromES,
} from '../../../../utils/es_queries_dashboards';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Create Sentinel Dashboards API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('creates Sentinel Workbook documents and identifies watchlists as missing resources', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: sentinelArmResourcesWithWorkbook,
      });

      const indexed = await getDashboardsPerMigrationFromES({ es, migrationId });
      expect(indexed.hits.hits.length).toBe(1);
      const doc = indexed.hits.hits[0]._source;
      expect(doc).toBeDefined();
      expect(doc?.migration_id).toBe(migrationId);
      expect(doc?.original_dashboard).toMatchObject({
        id: 'wb-1',
        title: 'Sign-in overview',
        format: 'json',
        vendor: 'microsoft-sentinel',
      });
      expect(doc?.original_dashboard.splunk_properties).toBeUndefined();

      const missing = await dashboardMigrationRoutes.resources.missing({ migrationId });
      expect(missing.body).toEqual(expect.arrayContaining(expectedSentinelWorkbookWatchlists));
    });

    it('returns 400 when resources is empty', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: { vendor: 'microsoft-sentinel', resources: [] },
        expectedStatusCode: 400,
      });
    });

    it('returns 400 when no Workbook resources are present', async () => {
      const response = await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: {
          vendor: 'microsoft-sentinel',
          resources: [
            {
              name: 'rule-1',
              type: 'Microsoft.SecurityInsights/alertRules',
              properties: {
                displayName: 'Not a workbook',
                serializedData: '{}',
              },
            },
          ],
        },
        expectedStatusCode: 400,
      });
      expect((response.body as unknown as { message?: string }).message).toContain(
        'No Workbooks found in the provided JSON'
      );
    });

    it('returns 404 when migration does not exist', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId: 'non-existent-migration-id',
        body: sentinelArmResourcesWithWorkbook,
        expectedStatusCode: 404,
      });
    });
  });
};
