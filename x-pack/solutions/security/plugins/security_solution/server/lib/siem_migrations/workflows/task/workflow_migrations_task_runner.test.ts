/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { SiemMigrationsClientDependencies } from '../../common/types';
import type { StoredWorkflowMigrationWorkflow } from '../types';
import { WorkflowMigrationTaskRunner } from './workflow_migrations_task_runner';

const mockLogger = loggerMock.create();
const mockDependencies = {
  telemetry: {},
} as unknown as SiemMigrationsClientDependencies;

const migrationWorkflow = {
  id: 'workflow-1',
  migration_id: 'migration-1',
  original_workflow: {
    id: 'story-1',
    vendor: 'tines',
    title: 'Receive alert',
    description: 'Imported from Tines',
    data: '{}',
    format: 'json',
  },
} as StoredWorkflowMigrationWorkflow;

describe('WorkflowMigrationTaskRunner', () => {
  const taskRunner = new WorkflowMigrationTaskRunner(
    'migration-1',
    'tines',
    {} as KibanaRequest,
    {} as AuthenticatedUser,
    new AbortController(),
    {} as never,
    mockLogger,
    mockDependencies
  );

  it('prepares the original workflow as the task input', async () => {
    await expect(
      // @ts-expect-error checking protected method
      taskRunner.prepareTaskInput(migrationWorkflow)
    ).resolves.toEqual({
      id: 'workflow-1',
      original_workflow: {
        id: 'story-1',
        vendor: 'tines',
        title: 'Receive alert',
        description: 'Imported from Tines',
        format: 'json',
      },
    });
  });

  it('stores the placeholder translation on the workflow document', () => {
    const output = {
      elastic_workflow: {
        title: 'Receive alert',
        description: 'Imported from Tines',
        yaml: 'version: "1"\nname: "Receive alert"',
      },
      translation_result: MigrationTranslationResult.FULL,
      comments: [
        {
          message: 'Placeholder translation',
          created_at: '2026-01-01T00:00:00.000Z',
          created_by: 'assistant',
        },
      ],
    };

    expect(
      // @ts-expect-error checking protected method
      taskRunner.processTaskOutput(migrationWorkflow, output)
    ).toEqual({
      ...migrationWorkflow,
      elastic_workflow: output.elastic_workflow,
      translation_result: MigrationTranslationResult.FULL,
      comments: output.comments,
    });
  });
});
