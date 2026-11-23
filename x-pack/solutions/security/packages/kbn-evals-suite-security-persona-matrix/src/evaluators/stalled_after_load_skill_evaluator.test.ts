/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createStalledAfterLoadSkillEvaluator } from './stalled_after_load_skill_evaluator';
import { buildOutput, toolCall } from '../__fixtures__/task_output_builders';

const run = (output: unknown) =>
  createStalledAfterLoadSkillEvaluator().evaluate({
    input: {},
    expected: {},
    output,
    metadata: {},
  } as never);

describe('StalledAfterLoadSkill', () => {
  it('is not stalled when another tool call follows load_skill', async () => {
    const result = await run(
      buildOutput({ steps: [toolCall('load_skill'), toolCall('security.alerts')], answer: '' })
    );
    expect(result.score).toBe(1);
  });

  it('is stalled when load_skill is last and the answer is empty', async () => {
    const result = await run(buildOutput({ steps: [toolCall('load_skill')], answer: '   ' }));
    expect(result.score).toBe(0);
  });

  it('is not stalled when load_skill is last but a final answer exists', async () => {
    const result = await run(buildOutput({ steps: [toolCall('load_skill')], answer: 'Done.' }));
    expect(result.score).toBe(1);
  });

  it('treats a fallback narration message as no answer', async () => {
    const result = await run(
      buildOutput({
        steps: [toolCall('load_skill')],
        answer: 'Let me load the skill first.',
        messageSource: 'last_assistant_step',
      })
    );
    expect(result.score).toBe(0);
  });
});
