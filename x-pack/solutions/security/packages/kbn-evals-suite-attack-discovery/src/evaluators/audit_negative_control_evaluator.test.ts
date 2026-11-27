/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAuditNegativeControlEvaluator } from './audit_negative_control_evaluator';
import {
  emptyInput,
  makeDiscovery,
  makeGold,
  makeOutput,
  resolveReferenceFromMetadata,
} from './audit_test_utils';

const evaluator = createAuditNegativeControlEvaluator(resolveReferenceFromMetadata);

const run = (expectedDiscoveries: 'none' | 'atLeastOne', count: number) =>
  evaluator.evaluate({
    input: emptyInput,
    output: makeOutput(Array.from({ length: count }, () => makeDiscovery())),
    expected: undefined,
    metadata: { gold: makeGold({ expectedDiscoveries }) },
  } as never);

describe('NegativeControl evaluator', () => {
  it('scores 1 when nothing is expected and nothing is reported', async () => {
    expect(await run('none', 0)).toMatchObject({ score: 1, label: 'no_discoveries' });
  });

  it('scores 0 when nothing is expected and a discovery is reported', async () => {
    expect(await run('none', 1)).toMatchObject({
      score: 0,
      label: 'false_positive: "Suspicious activity"',
    });
  });

  it('names the first invented title in the label and counts the rest', async () => {
    const result = await evaluator.evaluate({
      input: emptyInput,
      output: makeOutput([
        makeDiscovery({ title: 'Credential theft on host-1' }),
        makeDiscovery({ title: 'Lateral movement' }),
        makeDiscovery({ title: 'x'.repeat(100) }),
      ]),
      expected: undefined,
      metadata: { gold: makeGold({ expectedDiscoveries: 'none' }) },
    } as never);
    expect(result).toMatchObject({
      score: 0,
      label: 'false_positive: "Credential theft on host-1" (+2 more)',
    });
    expect(result.explanation).toContain('"Lateral movement"');
  });

  it('truncates a long title in the label', async () => {
    const result = await evaluator.evaluate({
      input: emptyInput,
      output: makeOutput([makeDiscovery({ title: 'y'.repeat(100) })]),
      expected: undefined,
      metadata: { gold: makeGold({ expectedDiscoveries: 'none' }) },
    } as never);
    expect(result.label).toBe(`false_positive: "${'y'.repeat(80)}…"`);
  });

  it('is N/A when at least one discovery is expected', async () => {
    expect(await run('atLeastOne', 0)).toMatchObject({ score: null, label: 'N/A' });
    expect(await run('atLeastOne', 2)).toMatchObject({ score: null, label: 'N/A' });
  });

  it('does not score a failed task as a pass', async () => {
    const result = await evaluator.evaluate({
      input: emptyInput,
      output: { insights: null, errors: ['boom'] },
      expected: undefined,
      metadata: { gold: makeGold({ expectedDiscoveries: 'none' }) },
    } as never);
    expect(result).toMatchObject({ score: null, label: 'task_error', explanation: 'boom' });
  });
});
