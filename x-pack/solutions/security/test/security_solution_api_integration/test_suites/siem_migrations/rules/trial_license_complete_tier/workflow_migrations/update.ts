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

  describe('@ess @serverless @serverlessQA Update Workflow Migration API', () => {
    let migrationId: string;

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
      const response = await workflowMigrationRoutes.create({ body: { name: 'initial name' } });
      migrationId = response.body.migration_id;
    });

    it('renames a stored migration', async () => {
      await workflowMigrationRoutes.update({
        migrationId,
        body: { name: 'updated name' },
      });

      const { body } = await workflowMigrationRoutes.get({ migrationId });
      expect(body.name).toBe('updated name');
    });

    it('returns 404 when the migration id is not stored', async () => {
      const { body } = await workflowMigrationRoutes.update({
        migrationId: 'non-existent-migration',
        body: { name: 'updated name' },
        expectStatusCode: 404,
      });

      expect(body).toMatchObject({
        message: 'No Migration found with id: non-existent-migration',
      });
    });
  });
};
