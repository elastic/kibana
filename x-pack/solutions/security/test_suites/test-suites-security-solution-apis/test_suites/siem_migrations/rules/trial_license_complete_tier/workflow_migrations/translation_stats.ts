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
  name: 'siem-workflow-migrations-translation-stats-mock-bedrock',
  connector_type_id: '.bedrock',
  config: {
    apiUrl: 'https://mock-bedrock.invalid.example.com',
  },
  secrets: {
    accessKey: 'mock-access-key',
    secret: 'mock-secret-key',
  },
};

const secondStory: TinesStoryExport = {
  ...tinesStoryExport,
  name: 'Send notification',
  guid: 'story-send-notification',
};

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const workflowMigrationRoutes = workflowMigrationRouteFactory(supertest);

  describe('@ess @serverless @serverlessQA Workflow Migration Translation Stats', () => {
    let connectorId: string;

    before(async () => {
      connectorId = await createConnector(supertest, MOCK_BEDROCK_CONNECTOR);
    });

    after(async () => {
      await deleteConnector(supertest, connectorId).expect(204);
    });

    beforeEach(async () => {
      await deleteAllWorkflowMigrations(es);
    });

    it('returns no content when the migration has no workflows', async () => {
      const createResponse = await workflowMigrationRoutes.create({});
      await workflowMigrationRoutes.translationStats({
        migrationId: createResponse.body.migration_id,
        expectStatusCode: 204,
      });
    });

    it('returns per-workflow outcome counts after a mixed batch', async () => {
      const createResponse = await workflowMigrationRoutes.create({});
      const migrationId = createResponse.body.migration_id;
      await workflowMigrationRoutes.addTinesWorkflowsToMigration({
        migrationId,
        body: [tinesStoryExport, secondStory],
      });

      const before = await workflowMigrationRoutes.translationStats({ migrationId });
      expect(before.body.items).toEqual({
        total: 2,
        success: {
          total: 0,
          result: { full: 0, partial: 0, untranslatable: 0 },
          installable: 0,
        },
        failed: 0,
      });

      await workflowMigrationRoutes.start({
        migrationId,
        body: { settings: { connector_id: connectorId } },
      });
      await pRetry(
        async () => {
          const stats = await workflowMigrationRoutes.stats({ migrationId });
          if (stats.body.status !== 'finished') {
            throw new Error(`expected finished, received ${stats.body.status}`);
          }
        },
        { retries: 10, minTimeout: 500 }
      );

      const workflows = await workflowMigrationRoutes.getWorkflows({ migrationId });
      const failedWorkflow = workflows.body.data.find(
        (workflow) => workflow.original_workflow.title === secondStory.name
      );
      if (!failedWorkflow?.id) {
        throw new Error(`expected a stored workflow named ${secondStory.name}`);
      }
      await markWorkflowFailed({ es, migrationId, workflowId: failedWorkflow.id });

      const after = await workflowMigrationRoutes.translationStats({ migrationId });
      expect(after.body).toEqual(
        expect.objectContaining({
          id: migrationId,
          items: {
            total: 2,
            success: {
              total: 1,
              result: { full: 1, partial: 0, untranslatable: 0 },
              installable: 1,
            },
            failed: 1,
          },
        })
      );
    });

    it('returns 404 when the migration does not exist', async () => {
      const response = await workflowMigrationRoutes.translationStats({
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
