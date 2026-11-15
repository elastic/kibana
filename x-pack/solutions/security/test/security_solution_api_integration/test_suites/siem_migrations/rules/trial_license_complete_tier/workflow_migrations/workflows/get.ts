/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
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

    describe('filtering', () => {
      const alphaStory = {
        ...tinesStoryExport,
        name: 'Alpha story',
        guid: 'story-guid-alpha',
      };
      const zuluStory = {
        ...tinesStoryExport,
        name: 'Zulu story',
        guid: 'story-guid-zulu',
      };

      beforeEach(async () => {
        await workflowMigrationRoutes.addTinesWorkflowsToMigration({
          migrationId,
          body: [zuluStory, alphaStory],
        });
      });

      it('returns only the workflows whose ids were requested', async () => {
        const listed = await workflowMigrationRoutes.getWorkflows({ migrationId });
        const requestedId = listed.body.data[0]?.id;
        if (requestedId == null) {
          throw new Error('Expected a stored workflow id');
        }

        const { body } = await workflowMigrationRoutes.getWorkflows({
          migrationId,
          queryParams: { ids: [requestedId] },
        });

        expect(body.total).toBe(1);
        expect(body.data.map(({ id }) => id)).toEqual([requestedId]);
      });

      it('returns no workflows when the id is not stored', async () => {
        const { body } = await workflowMigrationRoutes.getWorkflows({
          migrationId,
          queryParams: { ids: [uuidv4()] },
        });

        expect(body).toEqual({ total: 0, data: [] });
      });

      it('filters by whether the workflow is installed', async () => {
        const notInstalled = await workflowMigrationRoutes.getWorkflows({
          migrationId,
          queryParams: { is_installed: false },
        });
        expect(notInstalled.body.total).toBe(2);
        expect(notInstalled.body.data).toHaveLength(2);

        const installed = await workflowMigrationRoutes.getWorkflows({
          migrationId,
          queryParams: { is_installed: true },
        });
        expect(installed.body).toEqual({ total: 0, data: [] });
      });
    });

    describe('sorting', () => {
      beforeEach(async () => {
        await workflowMigrationRoutes.addTinesWorkflowsToMigration({
          migrationId,
          body: [
            { ...tinesStoryExport, name: 'Zulu story', guid: 'story-guid-zulu' },
            { ...tinesStoryExport, name: 'Alpha story', guid: 'story-guid-alpha' },
          ],
        });
      });

      it('sorts workflows by original title ascending', async () => {
        const { body } = await workflowMigrationRoutes.getWorkflows({
          migrationId,
          queryParams: { sort_field: 'original_workflow.title', sort_direction: 'asc' },
        });

        expect(body.data.map((workflow) => workflow.original_workflow.title)).toEqual([
          'Alpha story',
          'Zulu story',
        ]);
      });

      it('sorts workflows by original title descending', async () => {
        const { body } = await workflowMigrationRoutes.getWorkflows({
          migrationId,
          queryParams: { sort_field: 'original_workflow.title', sort_direction: 'desc' },
        });

        expect(body.data.map((workflow) => workflow.original_workflow.title)).toEqual([
          'Zulu story',
          'Alpha story',
        ]);
      });
    });
  });
};
