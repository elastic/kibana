/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetRunResult } from '@kbn/evals';
import { formatRubricCoverage } from './evaluate_dataset';

type EvaluationRun = DatasetRunResult['evaluationRuns'][number];

const run = (name: string, score: number | null | undefined): EvaluationRun => ({
  name,
  result: score === undefined ? undefined : { score },
  experimentRunId: 'r',
  direction: 'maximize',
});

const result = (evaluationRuns: EvaluationRun[]): DatasetRunResult => ({
  id: 'exp',
  experimentName: 'exp',
  datasetId: 'ds',
  datasetName: 'ds',
  runs: {},
  evaluationRuns,
});

describe('formatRubricCoverage', () => {
  it('counts unscored rubric cells explicitly instead of dropping them from the denominator', () => {
    const line = formatRubricCoverage([
      result([
        run('AttackDiscoveryRubric', 1),
        run('AttackDiscoveryRubric', 0),
        run('AttackDiscoveryRubric', null),
        run('AttackDiscoveryRubric', undefined),
        run('AttackDiscoveryBasic', 1),
      ]),
    ]);

    expect(line).toBe('AttackDiscoveryRubric coverage: scored 2/4, passed 1/2, unscored: 2');
  });

  it('reports unscored: 0 when every cell was scored', () => {
    expect(formatRubricCoverage([result([run('AttackDiscoveryRubric', 1)])])).toBe(
      'AttackDiscoveryRubric coverage: scored 1/1, passed 1/1, unscored: 0'
    );
  });
});
