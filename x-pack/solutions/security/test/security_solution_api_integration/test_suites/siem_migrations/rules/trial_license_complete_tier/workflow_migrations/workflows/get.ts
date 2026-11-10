/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import { deleteAllWorkflowMigrations } from '../../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../../utils/workflows';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Get Workflow Migration Workflows API', () => {
    let migrationId: string;

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
      const response = await workflowMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('lists the workflows stored for a migration', async () => {
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
      });

      const { body } = await workflowMigrationRoutes.getWorkflows({ migrationId });
      expect(body.total).toBe(1);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].original_workflow).toMatchObject({
        vendor: 'tines',
        title: tinesStoryExport.name,
        format: 'json',
      });
      expect(JSON.parse(body.data[0].original_workflow.data).agents).toEqual(
        tinesStoryExport.agents
      );
    });

    it('returns 404 when the migration id is not stored', async () => {
      const { body } = await workflowMigrationRoutes.getWorkflows({
        migrationId: 'non-existent-migration',
        expectStatusCode: 404,
      });

      expect(body).toMatchObject({
        message: 'No Migration found with id: non-existent-migration',
      });
    });
  });
};
