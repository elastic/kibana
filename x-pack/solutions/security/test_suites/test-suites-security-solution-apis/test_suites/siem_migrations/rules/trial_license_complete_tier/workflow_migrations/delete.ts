/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import pRetry from 'p-retry';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createConnector, deleteConnector } from '../../../../detections_response/utils/connectors';
import {
  deleteAllWorkflowMigrations,
  getWorkflowMigrationFromES,
  getWorkflowsPerMigrationFromES,
} from '../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

const MOCK_BEDROCK_CONNECTOR = {
  name: 'siem-workflow-migrations-delete-mock-bedrock',
  connector_type_id: '.bedrock',
  config: {
    apiUrl: 'https://mock-bedrock.invalid.example.com',
  },
  secrets: {
    accessKey: 'mock-access-key',
    secret: 'mock-secret-key',
  },
};

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
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
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

    it('returns 409 when the migration is running', async () => {
      const connectorId = await createConnector(supertest, MOCK_BEDROCK_CONNECTOR);
      try {
        await workflowMigrationRoutes.addTinesWorkflowsToMigration({
          migrationId,
          body: [tinesStoryExport],
        });
        const startResponse = await workflowMigrationRoutes.start({
          migrationId,
          body: { settings: { connector_id: connectorId } },
        });
        expect(startResponse.body).toEqual({ started: true });

        await pRetry(
          async () => {
            const stats = await workflowMigrationRoutes.stats({ migrationId });
            if (stats.body.status !== 'running') {
              throw new Error(`expected running, received ${stats.body.status}`);
            }
          },
          { retries: 20, minTimeout: 100, factor: 1 }
        );

        const deleteResponse = await workflowMigrationRoutes.delete({
          migrationId,
          expectStatusCode: 409,
        });
        expect(deleteResponse.body).toMatchObject({
          statusCode: 409,
          error: 'Conflict',
          message:
            'A running workflow migration cannot be deleted. Please stop the migration first and try again',
        });
      } finally {
        await workflowMigrationRoutes.stop({ migrationId }).catch(() => undefined);
        await deleteConnector(supertest, connectorId);
      }
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
