/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAlertAnalysisTrajectoryEvaluator,
  createAlertAnalysisUnclassifiedToolsEvaluator,
} from './evaluators';

const run = (toolCallIds: string[] | undefined, toolCallsUnavailable = false) =>
  createAlertAnalysisTrajectoryEvaluator().evaluate({
    input: {},
    output: { toolCallIds, toolCallsUnavailable },
    expected: { classification: 'true_positive' },
    metadata: null,
  });

describe('createAlertAnalysisTrajectoryEvaluator', () => {
  it('scores 1 when the agent called no tools', async () => {
    expect((await run([])).score).toBe(1);
  });

  it('scores 1 when the agent called only Agent Builder runtime tools', async () => {
    expect((await run(['attachments.add', 'attachments.read', 'write_todos'])).score).toBe(1);
  });

  it('scores 0 for a domain tool next to runtime tools', async () => {
    expect(await run(['attachments.add', 'security.get_alerts'])).toMatchObject({
      score: 0,
      label: 'unexpected-tools',
    });
  });

  it('scores 0 for a data-reaching internal tool', async () => {
    expect((await run(['execute_api'])).score).toBe(0);
  });

  it('is N/A naming a tool Agent Builder does not classify', async () => {
    expect(await run(['attachments.add', 'new_ab_tool'])).toMatchObject({
      score: null,
      label: 'N/A',
      explanation: 'unclassified-tool:new_ab_tool',
    });
  });

  it('is N/A when the traces are unavailable', async () => {
    expect((await run(undefined, true)).score).toBeNull();
  });
});

describe('createAlertAnalysisUnclassifiedToolsEvaluator', () => {
  it('counts the tools Agent Builder does not classify', async () => {
    const result = await createAlertAnalysisUnclassifiedToolsEvaluator().evaluate({
      input: {},
      output: { toolCallIds: ['attachments.add', 'new_ab_tool', 'security.get_alerts'] },
      expected: { classification: 'true_positive' },
      metadata: null,
    });
    expect(result).toMatchObject({ score: 1, metadata: { unclassifiedToolIds: ['new_ab_tool'] } });
  });
});
