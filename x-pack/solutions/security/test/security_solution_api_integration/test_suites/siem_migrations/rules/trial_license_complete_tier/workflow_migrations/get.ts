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

  describe('@ess @serverless @serverlessQA Get Workflow Migration API', () => {
    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
    });

    it('returns 404 when the migration id is not stored', async () => {
      const { body } = await workflowMigrationRoutes.get({
        migrationId: 'non-existent-migration',
        expectStatusCode: 404,
      });

      expect(body).toMatchObject({
        message: 'No Migration found with id: non-existent-migration',
      });
    });
  });
};
