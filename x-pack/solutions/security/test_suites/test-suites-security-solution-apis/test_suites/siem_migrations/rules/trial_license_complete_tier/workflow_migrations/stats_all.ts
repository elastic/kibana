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

  describe('@ess @serverless @serverlessQA Workflow Migration All Stats', () => {
    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
    });

    it('returns an empty list when no migrations exist', async () => {
      const response = await workflowMigrationRoutes.statsAll({});
      expect(response.body).toEqual([]);
    });

    it('returns progress for every migration', async () => {
      const first = await workflowMigrationRoutes.create({ body: { name: 'First stories' } });
      const second = await workflowMigrationRoutes.create({ body: { name: 'Second stories' } });
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId: first.body.migration_id,
        body: [tinesStoryExport],
      });
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId: second.body.migration_id,
        body: [tinesStoryExport, tinesStoryExport],
      });

      const response = await workflowMigrationRoutes.statsAll({});
      expect(response.body).toHaveLength(2);

      const firstStats = response.body.find((stats) => stats.id === first.body.migration_id);
      const secondStats = response.body.find((stats) => stats.id === second.body.migration_id);
      expect(firstStats).toEqual(
        expect.objectContaining({
          name: 'First stories',
          status: 'ready',
          items: expect.objectContaining({ total: 1, pending: 1 }),
        })
      );
      expect(secondStats).toEqual(
        expect.objectContaining({
          name: 'Second stories',
          status: 'ready',
          items: expect.objectContaining({ total: 2, pending: 2 }),
        })
      );
    });
  });
};
