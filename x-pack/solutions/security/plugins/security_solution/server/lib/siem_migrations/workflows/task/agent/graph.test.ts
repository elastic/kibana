/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AbortError } from '@kbn/kibana-utils-plugin/server';
import {
  MigrationTranslationResult,
  SIEM_MIGRATIONS_ASSISTANT_USER,
} from '../../../../../../common/siem_migrations/constants';
import type { OriginalWorkflow } from '../../../../../../common/siem_migrations/model/workflow_migration.gen';
import { BLOCK_TRANSLATION_TITLE, FAIL_TRANSLATION_TITLE } from './constants';
import { getWorkflowMigrationAgent } from './graph';

const originalWorkflow = (title: string): OriginalWorkflow => ({
  id: 'story-1',
  vendor: 'tines',
  title,
  description: 'Imported from Tines',
  data: '{}',
  format: 'json',
});

describe('getWorkflowMigrationAgent', () => {
  const agent = getWorkflowMigrationAgent({ modelName: 'test-model' });

  it('returns a full placeholder translation without calling a model', async () => {
    const result = await agent.invoke({
      id: 'workflow-1',
      original_workflow: originalWorkflow('Receive alert'),
    });

    expect(result.translation_result).toBe(MigrationTranslationResult.FULL);
    expect(result.elastic_workflow).toEqual({
      title: 'Receive alert',
      description: 'Imported from Tines',
      yaml: expect.stringContaining('name: "Receive alert"'),
    });
    expect(result.elastic_workflow.yaml).toEqual(expect.stringContaining('type: console'));
    expect(result.comments).toEqual([
      expect.objectContaining({
        created_by: SIEM_MIGRATIONS_ASSISTANT_USER,
        message: expect.stringContaining('test-model'),
      }),
    ]);
  });

  it('fails translation when the original title is fail-translation', async () => {
    await expect(
      agent.invoke({
        id: 'workflow-1',
        original_workflow: originalWorkflow(FAIL_TRANSLATION_TITLE),
      })
    ).rejects.toThrow('Dummy translation failed');
  });

  it('waits until abort when the original title is block-translation', async () => {
    const abortController = new AbortController();
    const pending = agent.invoke(
      {
        id: 'workflow-1',
        original_workflow: originalWorkflow(BLOCK_TRANSLATION_TITLE),
      },
      { signal: abortController.signal }
    );
    abortController.abort();

    await expect(pending).rejects.toBeInstanceOf(AbortError);
  });
});
