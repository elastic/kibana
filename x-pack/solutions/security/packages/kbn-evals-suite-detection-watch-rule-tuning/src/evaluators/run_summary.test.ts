/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { Evaluator } from '@kbn/evals';
import { logRunSummary, withScoreCollection, type ScoreSink } from './run_summary';

const collectingLog = (): { log: ToolingLog; lines: string[] } => {
  const lines: string[] = [];
  return {
    log: {
      info: (message: string) => lines.push(message),
      debug: jest.fn(),
      warning: jest.fn(),
    } as unknown as ToolingLog,
    lines,
  };
};

const evaluatorNamed = (name: string, score: number | null): Evaluator => ({
  name,
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async () => ({ score }),
});

describe('withScoreCollection', () => {
  it('is transparent — it returns each evaluator result unchanged', async () => {
    const sink: ScoreSink = new Map();
    const [first] = withScoreCollection([evaluatorNamed('ChangeTypeAccuracy', 1)], sink);
    await expect(first.evaluate({} as never)).resolves.toEqual({ score: 1 });
    expect(sink.get('ChangeTypeAccuracy')).toEqual([1]);
  });

  it('preserves the evaluator list shape so the run reports the same evaluators', () => {
    const sink: ScoreSink = new Map();
    const originals = [evaluatorNamed('A', 1), evaluatorNamed('B', 0)];
    const wrapped = withScoreCollection(originals, sink);
    expect(wrapped.map((e) => e.name)).toEqual(['A', 'B']);
    expect(wrapped.map((e) => e.kind)).toEqual(['CODE', 'CODE']);
    expect(wrapped.map((e) => e.direction)).toEqual(['maximize', 'maximize']);
  });

  it('records an N/A score as null, so it is counted separately from a 0', async () => {
    const sink: ScoreSink = new Map();
    const [naEvaluator] = withScoreCollection([evaluatorNamed('ToolRouting', null)], sink);
    await naEvaluator.evaluate({} as never);
    expect(sink.get('ToolRouting')).toEqual([null]);
    expect(sink.get('ToolRouting')).not.toEqual([0]);
  });
});

describe('logRunSummary', () => {
  it('labels a saturated evaluator differently from a discriminating one', () => {
    // The contract this pins: a structural evaluator pinned at 1.0 (ValidProposal is
    // expected to saturate — its job is schema conformance, not discrimination) must be
    // reported, never averaged into a pass/fail claim, and the run log must say so.
    const sink: ScoreSink = new Map([
      ['ChangeTypeAccuracy', [1, 0, 1, 1, 0, 1]],
      ['ValidProposal', [1, 1, 1, 1, 1, 1]],
    ]);
    const { log, lines } = collectingLog();

    logRunSummary({ sink, datasetName: 'security: rule-tuning-workflow-decision', log });

    const accuracy = lines.find((line) => line.includes('ChangeTypeAccuracy'));
    const proposal = lines.find((line) => line.includes('ValidProposal'));
    expect(accuracy).toBeDefined();
    expect(proposal).toBeDefined();

    expect(accuracy).toContain('mean 0.667');
    expect(accuracy).toMatch(/\(n=6\)/);
    expect(accuracy).not.toContain('SATURATED');

    expect(proposal).toContain('SATURATED(no signal)');
    expect(proposal).not.toContain('ChangeTypeAccuracy');
  });

  it('reports an all-N/A evaluator as unmeasured rather than as a zero', () => {
    const sink: ScoreSink = new Map([['ToolRouting', [null, null]]]);
    const { log, lines } = collectingLog();

    logRunSummary({ sink, datasetName: 'd', log });

    expect(lines[0]).toContain('mean n/a');
    expect(lines[0]).toContain('N/A×2');
    expect(lines[0]).toContain('UNMEASURED');
  });

  it('flags a single observation as carrying no resolvable interval', () => {
    const sink: ScoreSink = new Map([['ChangeTypeAccuracy', [1]]]);
    const { log, lines } = collectingLog();

    logRunSummary({ sink, datasetName: 'd', log });

    expect(lines[0]).toContain('±0.000(n=1)');
  });
});
