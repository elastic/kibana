/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dashboardMigrationRouteFactory } from '../../../../utils/dashboards';
import { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { defaultRawDashboard } from '../../../../utils/dashboard_mocks';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Create Rules API', () => {
    let migrationId: string;
    beforeEach(async () => {
      // await deleteAllRuleMigrations(es);
      const response = await dashboardMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('should create migrations with provided id', async () => {
      await dashboardMigrationRoutes.addDashboardsToMigration({
        migrationId,
        body: [defaultRawDashboard],
      });
    });
  });
};
