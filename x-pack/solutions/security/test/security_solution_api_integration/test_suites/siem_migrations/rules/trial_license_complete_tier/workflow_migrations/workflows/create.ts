/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../../ftr_provider_context';
import {
  deleteAllWorkflowMigrations,
  getWorkflowsPerMigrationFromES,
} from '../../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../../utils/workflows';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Create Workflow Migration Workflows API', () => {
    let migrationId: string;

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
      const response = await workflowMigrationRoutes.create({});
      migrationId = response.body.migration_id;
    });

    it('stores each Tines story as a workflow', async () => {
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
      });

      const indexed = await getWorkflowsPerMigrationFromES({ es, migrationId });
      expect(indexed.hits.hits).toHaveLength(1);
      expect(indexed.hits.hits[0]._source?.original_workflow).toMatchObject({
        id: tinesStoryExport.guid,
        vendor: 'tines',
        title: tinesStoryExport.name,
        description: tinesStoryExport.description,
        format: 'json',
        data: JSON.stringify(tinesStoryExport),
      });
      expect(indexed.hits.hits[0]._source?.status).toBe('pending');
    });

    it('returns 204 and stores nothing when the story list is empty', async () => {
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [],
        expectStatusCode: 204,
      });

      const indexed = await getWorkflowsPerMigrationFromES({ es, migrationId });
      expect(indexed.hits.hits).toHaveLength(0);
    });

    it('rejects a body that is not a Tines story and stores nothing', async () => {
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        // @ts-expect-error missing required agents
        body: [{ name: 'Not a story' }],
        expectStatusCode: 400,
      });

      const indexed = await getWorkflowsPerMigrationFromES({ es, migrationId });
      expect(indexed.hits.hits).toHaveLength(0);
    });

    it('returns 404 when the migration id is not stored', async () => {
      const { body } = await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId: 'non-existent-migration',
        body: [tinesStoryExport],
        expectStatusCode: 404,
      });

      expect(body).toMatchObject({
        message: 'No Migration found with id: non-existent-migration',
      });
    });
  });
};
