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
import { getWorkflowMigrationAgent, PLACEHOLDER_TRANSLATION_DELAY_MS } from './graph';
import * as placeholderNode from './nodes/placeholder';

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

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns a full placeholder translation without calling a model', async () => {
    jest.useFakeTimers();
    const pending = agent.invoke({
      id: 'workflow-1',
      original_workflow: originalWorkflow('Receive alert'),
    });
    await jest.advanceTimersByTimeAsync(PLACEHOLDER_TRANSLATION_DELAY_MS);

    const result = await pending;

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

  it('fails translation when the placeholder node returns an error', async () => {
    jest
      .spyOn(placeholderNode, 'placeholderNoOpNode')
      .mockRejectedValueOnce(new Error('Dummy translation failed'));

    await expect(
      agent.invoke({
        id: 'workflow-1',
        original_workflow: originalWorkflow('Receive alert'),
      })
    ).rejects.toThrow('Dummy translation failed');
  });

  it('rejects with AbortError when the translation is aborted during the wait', async () => {
    jest.useFakeTimers();
    const abortController = new AbortController();
    const pending = agent.invoke(
      {
        id: 'workflow-1',
        original_workflow: originalWorkflow('Receive alert'),
      },
      { signal: abortController.signal }
    );
    const assertion = expect(pending).rejects.toBeInstanceOf(AbortError);
    abortController.abort();

    await assertion;
  });
});
