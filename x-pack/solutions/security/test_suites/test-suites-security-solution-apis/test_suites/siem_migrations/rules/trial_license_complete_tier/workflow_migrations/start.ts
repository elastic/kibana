/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import pRetry from 'p-retry';
import type { TinesStoryExport } from '@kbn/security-solution-plugin/common/siem_migrations/model/vendor/workflows/tines.gen';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { createConnector, deleteConnector } from '../../../../detections_response/utils/connectors';
import {
  deleteAllWorkflowMigrations,
  markWorkflowFailed,
} from '../../../utils/es_queries_workflows';
import { tinesStoryExport } from '../../../utils/workflow_mocks';
import { workflowMigrationRouteFactory } from '../../../utils/workflows';

const MOCK_BEDROCK_CONNECTOR = {
  name: 'siem-workflow-migrations-mock-bedrock',
  connector_type_id: '.bedrock',
  config: {
    apiUrl: 'https://mock-bedrock.invalid.example.com',
  },
  secrets: {
    accessKey: 'mock-access-key',
    secret: 'mock-secret-key',
  },
};

const storyNamed = (name: string): TinesStoryExport => ({
  ...tinesStoryExport,
  name,
  guid: `story-${name}`,
});

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Start Workflow Migration', () => {
    let connectorId: string;

    const waitForStatus = async (migrationId: string, status: string) => {
      await pRetry(
        async () => {
          const response = await workflowMigrationRoutes.stats({ migrationId });
          if (response.body.status !== status) {
            throw new Error(`expected ${status}, received ${response.body.status}`);
          }
        },
        { retries: 10, minTimeout: 500 }
      );
    };

    before(async () => {
      connectorId = await createConnector(supertest, MOCK_BEDROCK_CONNECTOR);
    });

    after(async () => {
      await deleteConnector(supertest, connectorId).expect(204);
    });

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
    });

    it('stores the selected connector and does not translate finished workflows again', async () => {
      const createResponse = await workflowMigrationRoutes.create({});
      const migrationId = createResponse.body.migration_id;
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport],
      });

      const response = await workflowMigrationRoutes.start({
        migrationId,
        body: { settings: { connector_id: connectorId } },
      });
      expect(response.body).toEqual({ started: true });

      const migrationResponse = await workflowMigrationRoutes.get({ migrationId });
      expect(migrationResponse.body.last_execution?.connector_id).toEqual(connectorId);
      expect(migrationResponse.body.last_execution?.started_at).toEqual(expect.any(String));

      await waitForStatus(migrationId, 'finished');

      const workflows = await workflowMigrationRoutes.getWorkflows({ migrationId });
      expect(workflows.body.total).toBe(1);
      expect(workflows.body.data[0]).toEqual(
        expect.objectContaining({
          status: 'completed',
          translation_result: 'full',
          elastic_workflow: expect.objectContaining({
            title: 'Receive alert',
            yaml: expect.stringContaining('name: "Receive alert"'),
          }),
        })
      );
      const translatedAt = workflows.body.data[0].comments?.[0]?.created_at;

      const secondStart = await workflowMigrationRoutes.start({
        migrationId,
        body: { settings: { connector_id: connectorId } },
      });
      expect(secondStart.body).toEqual({ started: false });

      const workflowsAfter = await workflowMigrationRoutes.getWorkflows({ migrationId });
      expect(workflowsAfter.body.data[0].status).toBe('completed');
      expect(workflowsAfter.body.data[0].comments?.[0]?.created_at).toEqual(translatedAt);
    });

    it('retries only the failed workflow', async () => {
      const retriedTitle = 'Send notification';
      const createResponse = await workflowMigrationRoutes.create({});
      const migrationId = createResponse.body.migration_id;
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport, storyNamed(retriedTitle)],
      });

      await workflowMigrationRoutes.start({
        migrationId,
        body: { settings: { connector_id: connectorId } },
      });
      await waitForStatus(migrationId, 'finished');

      const workflows = await workflowMigrationRoutes.getWorkflows({ migrationId });
      const translated = workflows.body.data.find(
        (workflow) => workflow.original_workflow.title === 'Receive alert'
      );
      const failed = workflows.body.data.find(
        (workflow) => workflow.original_workflow.title === retriedTitle
      );
      expect(translated?.status).toBe('completed');
      expect(translated?.translation_result).toBe('full');
      if (!failed?.id) {
        throw new Error(`expected a stored workflow named ${retriedTitle}`);
      }
      await markWorkflowFailed({ es, migrationId, workflowId: failed.id });
      const translatedAt = translated?.comments?.[0]?.created_at;

      const retryResponse = await workflowMigrationRoutes.start({
        migrationId,
        body: { settings: { connector_id: connectorId }, retry: 'failed' },
      });
      expect(retryResponse.body).toEqual({ started: true });
      await waitForStatus(migrationId, 'finished');

      const workflowsAfter = await workflowMigrationRoutes.getWorkflows({ migrationId });
      const translatedAfter = workflowsAfter.body.data.find(
        (workflow) => workflow.original_workflow.title === 'Receive alert'
      );
      const failedAfter = workflowsAfter.body.data.find(
        (workflow) => workflow.original_workflow.title === retriedTitle
      );
      expect(translatedAfter?.status).toBe('completed');
      expect(translatedAfter?.comments?.[0]?.created_at).toEqual(translatedAt);
      expect(failedAfter?.status).toBe('completed');
      expect(failedAfter?.translation_result).toBe('full');

      const stats = await workflowMigrationRoutes.stats({ migrationId });
      expect(stats.body.items).toEqual({
        total: 2,
        pending: 0,
        processing: 0,
        completed: 2,
        failed: 0,
      });
    });

    describe('error scenarios', () => {
      it('rejects an unknown connector', async () => {
        const createResponse = await workflowMigrationRoutes.create({});
        const migrationId = createResponse.body.migration_id;
        await workflowMigrationRoutes.addTinesWorkflowsToMigration({
          migrationId,
          body: [tinesStoryExport],
        });

        const response = await workflowMigrationRoutes.start({
          migrationId,
          expectStatusCode: 500,
          body: { settings: { connector_id: 'missing-connector' } },
        });
        expect(response.body).toEqual(
          expect.objectContaining({
            message: "No connector or inference endpoint found for ID 'missing-connector'",
          })
        );
      });

      it('returns 404 when the migration does not exist', async () => {
        await workflowMigrationRoutes.start({
          migrationId: 'missing-migration',
          expectStatusCode: 404,
          body: { settings: { connector_id: connectorId } },
        });
      });
    });
  });
};
