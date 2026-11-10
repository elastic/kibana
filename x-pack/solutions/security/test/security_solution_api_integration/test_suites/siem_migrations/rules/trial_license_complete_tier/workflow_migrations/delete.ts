/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import {
  deleteAllWorkflowMigrations,
  getWorkflowMigrationFromES,
  getWorkflowsPerMigrationFromES,
} from '../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Delete Workflow Migration API', () => {
    let migrationId: string;

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
      const response = await workflowMigrationRoutes.create({ body: { name: 'Tines stories' } });
      migrationId = response.body.migration_id;
    });

    it('deletes the migration and its stored workflows', async () => {
      await workflowMigrationRoutes.addWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
      });

      await workflowMigrationRoutes.delete({ migrationId });

      await workflowMigrationRoutes.get({
        migrationId,
        expectStatusCode: 404,
      });

      const migrationsFromES = await getWorkflowMigrationFromES({ es, migrationId });
      const workflowsFromES = await getWorkflowsPerMigrationFromES({ es, migrationId });
      expect(migrationsFromES.hits.hits).toHaveLength(0);
      expect(workflowsFromES.hits.hits).toHaveLength(0);
    });

    it('returns 404 when the migration id is not stored', async () => {
      const { body } = await workflowMigrationRoutes.delete({
        migrationId: 'non-existent-migration',
        expectStatusCode: 404,
      });

      expect(body).toMatchObject({
        message: 'No Migration found with id: non-existent-migration',
      });
    });
  });
};
