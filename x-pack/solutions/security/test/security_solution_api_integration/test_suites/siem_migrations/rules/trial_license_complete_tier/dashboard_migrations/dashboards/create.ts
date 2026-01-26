/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { defaultOriginalDashboardExports } from '../../../../utils/dashboard_mocks';
import {
  deleteAllDashboardMigrations,
  getDashboardsPerMigrationFromES,
} from '../../../../utils/es_queries_dashboards';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Create Dashboards API', () => {
    let migrationId: string;
    beforeEach(async () => {
      await deleteAllDashboardMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should create dashboards in provided migrationId id', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [defaultOriginalDashboardExports],
      });

      const actualIndexedData = await getDashboardsPerMigrationFromES({
        es,
        migrationId,
      });

      expect(actualIndexedData.hits.hits.length).toBe(1);
      const doc = actualIndexedData.hits.hits[0]._source;

      expect(doc).toBeDefined();
      expect(doc?.migration_id).toBe(migrationId);
      expect(doc?.status).toBe('pending');
      expect(doc?.original_dashboard).toMatchObject({
        id: defaultOriginalDashboardExports.result.id,
        title: defaultOriginalDashboardExports.result.label,
        description: defaultOriginalDashboardExports.result.description,
        data: defaultOriginalDashboardExports.result['eai:data'],
        format: 'xml',
        vendor: 'splunk',
        last_updated: defaultOriginalDashboardExports.result.updated,
        splunk_properties: {
          app: defaultOriginalDashboardExports.result['eai:acl.app'],
          owner: defaultOriginalDashboardExports.result['eai:acl.owner'],
          sharing: defaultOriginalDashboardExports.result['eai:acl.sharing'],
        },
      });
    });
  });
};
