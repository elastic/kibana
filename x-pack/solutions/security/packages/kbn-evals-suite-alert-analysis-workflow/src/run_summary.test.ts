/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { logRunSummary, withScoreCollection } from './run_summary';

const makeEvaluator = (name: string, scores: Array<number | null>) => {
  const evaluate = jest.fn(
    async (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...args: any[]
    ) => {
      void args;
      const score = scores.shift() ?? null;
      return { score, label: score == null ? 'N/A' : String(score) };
    }
  );
  return {
    name,
    kind: 'CODE' as const,
    direction: 'maximize' as const,
    evaluate,
  };
};

describe('run summary', () => {
  it('collects observed scores per evaluator, including nulls', async () => {
    const sink = new Map<string, Array<number | null>>();
    const evaluator = makeEvaluator('ClassificationAccuracy', [1, null, 0]);
    const wrapped = withScoreCollection([evaluator], sink);
    for (let i = 0; i < 3; i++) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await wrapped[0].evaluate({} as any);
    }
    expect(sink.get('ClassificationAccuracy')).toEqual([1, null, 0]);
  });

  it('reports the N/A count so gaps cannot vanish from the report', () => {
    const log = { info: jest.fn() };
    const sink = new Map<string, Array<number | null>>([
      ['ClassificationAccuracy', [1, 1, 0, null]],
      ['criteria', [null, null, null]],
    ]);
    const rows = logRunSummary({ sink, datasetName: 'ds', log: log as unknown as ToolingLog });

    expect(rows).toEqual([
      { name: 'ClassificationAccuracy', scored: 3, naCount: 1 },
      { name: 'criteria', scored: 0, naCount: 3 },
    ]);
    const logged = log.info.mock.calls.map((c) => c[0]).join('\n');
    expect(logged).toContain('N/A×1');
    expect(logged).toContain('N/A×3');
    expect(logged).toContain('total N/A: 4');
  });
});
