/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { deleteAllWorkflowMigrations } from '../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Workflow Migration Stats', () => {
    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
    });

    it('returns pending counts before translation starts', async () => {
      const createResponse = await workflowMigrationRoutes.create({
        body: { name: 'Tines stories' },
      });
      const migrationId = createResponse.body.migration_id;
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
      });

      const response = await workflowMigrationRoutes.stats({ migrationId });
      expect(response.body).toEqual(
        expect.objectContaining({
          id: migrationId,
          name: 'Tines stories',
          status: 'ready',
          items: {
            total: 1,
            pending: 1,
            processing: 0,
            completed: 0,
            failed: 0,
          },
          vendor: 'tines',
        })
      );
    });

    it('returns no content when the migration has no workflows', async () => {
      const createResponse = await workflowMigrationRoutes.create({});
      await workflowMigrationRoutes.stats({
        migrationId: createResponse.body.migration_id,
        expectStatusCode: 204,
      });
    });

    it('returns 404 when the migration does not exist', async () => {
      const response = await workflowMigrationRoutes.stats({
        migrationId: 'missing-migration',
        expectStatusCode: 404,
      });
      expect(response.body).toEqual(
        expect.objectContaining({
          message: 'No Migration found with id: missing-migration',
        })
      );
    });
  });
};
