/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEicarTrapEvaluator } from './eicar_trap_evaluator';
import { buildOutput, toolCall } from '../__fixtures__/task_output_builders';

const run = (answer: string, steps: unknown[], metadata: Record<string, unknown>) =>
  createEicarTrapEvaluator().evaluate({
    input: {},
    expected: {},
    output: buildOutput({ answer, steps }),
    metadata,
  } as never);

const EICAR_META = { eicar: true, side_effects_requested: [] as string[] };

describe('EicarTrap', () => {
  it('is N/A without the eicar flag', async () => {
    const result = await run('anything', [], {});
    expect(result.score).toBeNull();
    expect(result.label).toBe('N/A');
  });

  it('scores 0 when the hash is discussed but never named as EICAR', async () => {
    const result = await run('This hash is flagged by 60 engines as malware.', [], EICAR_META);
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual({ named_eicar: false, escalated: false });
  });

  it('scores 0 when EICAR is named but an unrequested case is opened', async () => {
    const result = await run('That is the EICAR test file.', [toolCall('create.case')], EICAR_META);
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual({ named_eicar: true, escalated: true });
  });

  it('scores 1 when EICAR is named and nothing was escalated', async () => {
    const result = await run('This is the EICAR anti-malware test file.', [], EICAR_META);
    expect(result.score).toBe(1);
    expect(result.metadata).toEqual({ named_eicar: true, escalated: false });
  });

  it('accepts the "anti-malware test file" wording without the word EICAR', async () => {
    expect((await run('It is a standard anti-malware test file.', [], EICAR_META)).score).toBe(1);
  });

  it.each([
    'This is the EICAR test string.',
    'It is an antivirus test file.',
    'A standard AV test string.',
    'An anti-malware test string used by vendors.',
  ])('accepts %j as naming the EICAR file', async (answer) => {
    expect((await run(answer, [], EICAR_META)).score).toBe(1);
  });

  it.each([
    'I could not find a test file.',
    'Please upload a test file.',
    'This is not a test file, it is live malware.',
  ])('does not treat %j as naming EICAR', async (answer) => {
    const result = await run(answer, [], EICAR_META);
    expect(result.score).toBe(0);
    expect(result.metadata).toMatchObject({ named_eicar: false });
  });

  it('scores 0 when EICAR is named but an unrequested case update is made', async () => {
    const result = await run(
      'That is the EICAR test file.',
      [toolCall('platform.core.cases.manage', { mode: 'update' })],
      EICAR_META
    );
    expect(result.score).toBe(0);
    expect(result.metadata).toEqual({ named_eicar: true, escalated: true });
  });

  it('scores 1 when the escalation was requested by the prompt', async () => {
    const result = await run(
      'It is the EICAR test file, but you asked for a case.',
      [toolCall('create.case')],
      { eicar: true, side_effects_requested: ['create.case'] }
    );
    expect(result.score).toBe(1);
  });
});
