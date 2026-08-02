/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { extractGatePrompt } from '.';

const step = (input: unknown, stepId = 'await_open_investigation'): EsWorkflowStepExecution =>
  ({ id: 'e1', input, stepId, workflowId: 'wf', workflowRunId: 'run' } as EsWorkflowStepExecution);

describe('extractGatePrompt', () => {
  it('surfaces the message as the prompt', () => {
    expect(extractGatePrompt(step({ message: 'Open an investigation?' })).message).toEqual(
      'Open an investigation?'
    );
  });

  it('uses the message as the title', () => {
    expect(extractGatePrompt(step({ message: 'Open an investigation?' })).title).toEqual(
      'Open an investigation?'
    );
  });

  it('surfaces the schema as inputSchema', () => {
    const schema = { properties: { decision: { type: 'string' } }, type: 'object' };

    expect(extractGatePrompt(step({ message: 'x', schema })).inputSchema).toEqual(schema);
  });

  it('falls back to a step-id title when there is no message', () => {
    expect(extractGatePrompt(step({})).title).toEqual(
      'Step "await_open_investigation" is waiting for input'
    );
  });

  it('returns an empty message when none is present', () => {
    expect(extractGatePrompt(step({})).message).toEqual('');
  });

  it('returns an empty object when the schema is missing', () => {
    expect(extractGatePrompt(step({ message: 'x' })).inputSchema).toEqual({});
  });

  it('ignores a non-object schema', () => {
    expect(extractGatePrompt(step({ message: 'x', schema: 'not-an-object' })).inputSchema).toEqual(
      {}
    );
  });

  it('ignores an array schema', () => {
    expect(extractGatePrompt(step({ message: 'x', schema: [1, 2] })).inputSchema).toEqual({});
  });

  it('tolerates a missing input entirely', () => {
    expect(extractGatePrompt(step(undefined)).message).toEqual('');
  });

  it('bounds an oversized message to the row schema limit', () => {
    const long = 'a'.repeat(5000);

    expect(extractGatePrompt(step({ message: long })).message).toHaveLength(4096);
  });
});
