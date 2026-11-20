/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { skipForGenerateApiMode } from './skip_for_generate_api';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

const createBaseEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> & { evaluate: jest.Mock } => ({
  name: 'Latency',
  kind: 'CODE',
  direction: 'minimize',
  evaluate: jest.fn().mockResolvedValue({ score: 12.5, label: 'seconds' }),
});

const evaluate = async (
  baseEvaluator: ReturnType<typeof createBaseEvaluator>,
  input: AttackDiscoveryDatasetExample['input']
) =>
  skipForGenerateApiMode(baseEvaluator).evaluate({
    input,
    output: { insights: [] },
    expected: undefined,
    metadata: undefined,
  });

describe('skipForGenerateApiMode', () => {
  it('returns N/A for generateApi examples', async () => {
    const baseEvaluator = createBaseEvaluator();
    const result = await evaluate(baseEvaluator, { mode: 'generateApi', connectorId: 'id' });

    expect(result).toMatchObject({ score: null, label: 'N/A' });
    expect(baseEvaluator.evaluate).not.toHaveBeenCalled();
  });

  it.each([
    ['searchAlerts', { mode: 'searchAlerts', size: 1 }],
    ['graphState', { mode: 'graphState', anonymizedAlerts: [] }],
  ] as const)('delegates %s examples to the wrapped evaluator', async (_mode, input) => {
    const baseEvaluator = createBaseEvaluator();
    const result = await evaluate(baseEvaluator, input);

    expect(result).toMatchObject({ score: 12.5, label: 'seconds' });
    expect(baseEvaluator.evaluate).toHaveBeenCalledTimes(1);
  });

  it('preserves the wrapped evaluator identity', () => {
    const wrapped = skipForGenerateApiMode(createBaseEvaluator());

    expect(wrapped.name).toBe('Latency');
    expect(wrapped.direction).toBe('minimize');
    expect(wrapped.kind).toBe('CODE');
  });
});
