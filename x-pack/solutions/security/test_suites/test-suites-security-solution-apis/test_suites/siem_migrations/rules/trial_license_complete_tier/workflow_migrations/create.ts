/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { deleteAllWorkflowMigrations } from '../../../utils/es_queries_workflows';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Create Workflow Migration API', () => {
    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
    });

    it('stores a migration and returns its id', async () => {
      const name = 'Tines stories';
      const {
        body: { migration_id: migrationId },
      } = await workflowMigrationRoutes.create({ body: { name } });

      expect(migrationId).toEqual(expect.any(String));
      expect(migrationId.length).toBeGreaterThan(0);

      const { body } = await workflowMigrationRoutes.get({ migrationId });
      expect(body.id).toBe(migrationId);
      expect(body.name).toBe(name);
      expect(body.created_by).not.toBeNull();
    });
  });
};
