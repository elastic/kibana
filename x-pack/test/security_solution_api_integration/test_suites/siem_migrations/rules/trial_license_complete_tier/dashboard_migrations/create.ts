/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { dashboardMigrationRouteFactory } from '../../../utils/dashboards';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const dashboardMigrationRoutes = dashboardMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Create API', () => {
    beforeEach(async () => {
      // await deleteAllRuleMigrations(es);
    });

    it('should create migrations without any issues', async () => {
      const name = 'creation test migration name';
      const {
        body: { migration_id: migrationId },
      } = await dashboardMigrationRoutes.create({ body: { name } });

      expect(migrationId).not.toBeNull();
    });
  });
};
