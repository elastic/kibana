/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import pRetry from 'p-retry';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  defaultOriginalDashboardExports,
  splunkXMLWithMultipleQueries,
} from '../../../../utils/dashboard_mocks';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import {
  deleteAllDashboardMigrations,
  getDashboardResourcesPerMigrationFromES,
} from '../../../../utils/es_queries_dashboards';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Dashboard Migration Missing Resources', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should identify and persist macros and lookups from multiple queries in a dashboard', async () => {
      const sampleDashbaordExport = {
        ...defaultOriginalDashboardExports,
        result: {
          ...defaultOriginalDashboardExports.result,
          'eai:data': splunkXMLWithMultipleQueries,
        },
      };

      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [sampleDashbaordExport],
      });

      await pRetry(
        async () => {
          const resourcesIndexData = await getDashboardResourcesPerMigrationFromES({
            es,
            migrationId,
          });

          expect(resourcesIndexData.hits.hits.length).toBeGreaterThan(0);
        },
        {
          retries: 3,
        }
      );

      const missingResourcesResponse = await dashboardMigrationRoutes.resources.missing({
        migrationId,
      });

      expect(missingResourcesResponse.body).toMatchObject([
        { name: 'system_metric_search', type: 'macro' },
        { name: 'macro_one(2)', type: 'macro' },
        { name: 'macro_two(1)', type: 'macro' },
        { name: 'ColorScheme', type: 'lookup' },
        { name: 'my_lookup_table', type: 'lookup' },
        { name: 'other_lookup_list', type: 'lookup' },
        { name: 'third', type: 'lookup' },
      ]);
    });
  });
};
