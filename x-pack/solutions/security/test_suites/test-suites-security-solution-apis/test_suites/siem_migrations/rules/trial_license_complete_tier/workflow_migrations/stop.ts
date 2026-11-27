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
import { deleteAllWorkflowMigrations } from '../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

const MOCK_BEDROCK_CONNECTOR = {
  name: 'siem-workflow-migrations-stop-mock-bedrock',
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

  describe('@ess @serverless @serverlessQA Stop Workflow Migration', () => {
    let connectorId: string;
    let migrationId: string | undefined;

    before(async () => {
      connectorId = await createConnector(supertest, MOCK_BEDROCK_CONNECTOR);
    });

    after(async () => {
      await deleteConnector(supertest, connectorId).expect(204);
    });

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
      migrationId = undefined;
    });

    afterEach(async () => {
      if (migrationId) {
        await workflowMigrationRoutes.stop({ migrationId }).catch(() => undefined);
      }
    });

    it('stops a running migration and leaves unfinished workflows pending', async () => {
      const createResponse = await workflowMigrationRoutes.create({});
      migrationId = createResponse.body.migration_id;
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
          const stats = await workflowMigrationRoutes.stats({ migrationId: migrationId! });
          if (stats.body.status !== 'running') {
            throw new Error(`expected running, received ${stats.body.status}`);
          }
        },
        { retries: 20, minTimeout: 100, factor: 1 }
      );

      const stopResponse = await workflowMigrationRoutes.stop({ migrationId });
      expect(stopResponse.body).toEqual({ stopped: true });

      await pRetry(
        async () => {
          const stats = await workflowMigrationRoutes.stats({ migrationId: migrationId! });
          if (stats.body.status !== 'stopped') {
            throw new Error(`expected stopped, received ${stats.body.status}`);
          }
        },
        { retries: 10, minTimeout: 200 }
      );

      const migration = await workflowMigrationRoutes.get({ migrationId });
      expect(migration.body.last_execution?.is_stopped).toBe(true);

      const workflows = await workflowMigrationRoutes.getWorkflows({ migrationId });
      expect(workflows.body.data[0].status).not.toBe('completed');
    });

    it('returns 404 when the migration does not exist', async () => {
      await workflowMigrationRoutes.stop({
        migrationId: 'missing-migration',
        expectStatusCode: 404,
      });
    });
  });
};
