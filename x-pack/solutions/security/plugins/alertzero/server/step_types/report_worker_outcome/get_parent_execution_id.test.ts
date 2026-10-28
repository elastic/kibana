/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getParentExecutionId } from './get_parent_execution_id';

describe('getParentExecutionId', () => {
  it('reads the flat key a running child is created with', () => {
    expect(getParentExecutionId({ parentWorkflowExecutionId: 'exec-parent' })).toBe('exec-parent');
  });

  it('falls back to the nested parent a terminal save merges in', () => {
    expect(
      getParentExecutionId({ parent: { executionId: 'exec-parent', workflowId: 'wf-parent' } })
    ).toBe('exec-parent');
  });

  it('prefers the flat key when both shapes are present', () => {
    expect(
      getParentExecutionId({
        parent: { executionId: 'exec-nested' },
        parentWorkflowExecutionId: 'exec-flat',
      })
    ).toBe('exec-flat');
  });

  it.each<[string, Record<string, unknown> | undefined]>([
    ['returns undefined for a top-level execution', { workflowId: 'wf-root' }],
    ['returns undefined when the context is missing', undefined],
    ['ignores an empty flat key', { parentWorkflowExecutionId: '' }],
    ['ignores a non-string flat key', { parentWorkflowExecutionId: 42 }],
    ['ignores a non-object parent', { parent: 'exec-parent' }],
    ['ignores a non-string nested id', { parent: { executionId: 42 } }],
  ])('%s', (_title, context) => {
    expect(getParentExecutionId(context)).toBeUndefined();
  });
});
