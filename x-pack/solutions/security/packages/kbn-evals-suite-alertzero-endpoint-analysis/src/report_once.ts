/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';

const DUPLICATE_REPETITION = '__duplicateRepetition';

/**
 * The executor calls `task` once per repetition. The reporters replay one already-observed
 * workflow output, so only the first repetition may carry it: later ones return a marker that
 * `scoreOnce` evaluators score as `null`, instead of re-scoring the same observation N times
 * and overstating the sample count.
 */
export const replayOnce = <T>(observed: T): (() => Promise<T | Record<string, unknown>>) => {
  let replayed = false;
  return async () => {
    if (replayed) return { [DUPLICATE_REPETITION]: true };
    replayed = true;
    return observed;
  };
};

export const scoreOnce = (evaluator: Evaluator): Evaluator => ({
  ...evaluator,
  getModel: evaluator.getModel?.bind(evaluator),
  evaluate: async (args) =>
    (args.output as Record<string, unknown> | null | undefined)?.[DUPLICATE_REPETITION]
      ? {
          score: null,
          label: 'duplicate repetition',
          explanation: 'Repetition of an already-scored observation',
        }
      : evaluator.evaluate(args),
});
