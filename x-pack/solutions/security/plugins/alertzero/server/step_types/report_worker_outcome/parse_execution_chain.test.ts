/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseExecutionChain } from './parse_execution_chain';

const ROOT_HOP = { executionId: 'exec-root', invocation: 'sync', workflowId: 'wf-root' } as const;
const PARENT_HOP = {
  executionId: 'exec-parent',
  invocation: 'async',
  workflowId: 'wf-parent',
} as const;

describe('parseExecutionChain', () => {
  it('returns the hops root first, keeping only their own fields', () => {
    expect(
      parseExecutionChain(
        { executionChain: [{ ...ROOT_HOP, extra: 'dropped' }, PARENT_HOP], other: 'ignored' },
        10
      )
    ).toEqual([ROOT_HOP, PARENT_HOP]);
  });

  it('accepts a hop whose workflow id is empty (an unsaved test-run workflow)', () => {
    expect(parseExecutionChain({ executionChain: [{ ...ROOT_HOP, workflowId: '' }] }, 10)).toEqual([
      { ...ROOT_HOP, workflowId: '' },
    ]);
  });

  it.each([
    ['an undefined context', undefined],
    ['a context without a chain', { parentWorkflowExecutionId: 'exec-parent' }],
    ['an empty chain', { executionChain: [] }],
    ['a chain that is not an array', { executionChain: ROOT_HOP }],
    ['a null hop', { executionChain: [ROOT_HOP, null] }],
    ['a hop without an execution id', { executionChain: [{ ...ROOT_HOP, executionId: '' }] }],
    ['a hop without a workflow id', { executionChain: [{ executionId: 'e', invocation: 'sync' }] }],
    [
      'a hop with an unknown invocation',
      { executionChain: [{ ...ROOT_HOP, invocation: 'later' }] },
    ],
    [
      'a repeated execution id',
      { executionChain: [ROOT_HOP, { ...PARENT_HOP, executionId: 'exec-root' }] },
    ],
    [
      'more hops than allowed',
      { executionChain: [ROOT_HOP, PARENT_HOP, { ...PARENT_HOP, executionId: 'e3' }] },
    ],
  ])('returns undefined for %s', (_label, context) => {
    expect(parseExecutionChain(context, 2)).toBeUndefined();
  });
});
