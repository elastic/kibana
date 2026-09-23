/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationScoreDocument } from '@kbn/evals-common';
import {
  aliasJudgeVerdicts,
  aliasTraceKeys,
  countRepetitions,
  exampleScoresByEvaluator,
  exampleSpreadByEvaluator,
  overlayRepeatedCacheTrails,
  queryMatrixTraces,
} from './query_matrix_traces';
import type { MatrixTraceData } from './trace_types';
import type { JudgeVerdict } from './judge_agreement';

const doc = (evaluatorName: string | undefined, score: number | null): EvaluationScoreDocument =>
  ({
    evaluator: { name: evaluatorName, score },
  } as EvaluationScoreDocument);

describe('exampleScoresByEvaluator', () => {
  it('means scores per evaluator across repetitions', () => {
    const result = exampleScoresByEvaluator([
      doc('ExpectedToolCalled', 0.8),
      doc('ExpectedToolCalled', 1),
      doc('Correctness', 0.5),
    ]);
    expect(result).toEqual({ ExpectedToolCalled: 0.9, Correctness: 0.5 });
  });

  it('skips documents without an evaluator name or a numeric score', () => {
    const result = exampleScoresByEvaluator([
      doc('ExpectedToolCalled', 0.8),
      doc('ExpectedToolCalled', null),
      doc(undefined, 0.4),
    ]);
    expect(result).toEqual({ ExpectedToolCalled: 0.8 });
  });

  it('returns an empty map when nothing is scorable', () => {
    expect(exampleScoresByEvaluator([doc('ExpectedToolCalled', null)])).toEqual({});
    expect(exampleScoresByEvaluator([])).toEqual({});
  });
});

describe('exampleSpreadByEvaluator', () => {
  const repDoc = (name: string, score: number, repetition: number) =>
    ({
      evaluator: { name, score },
      task: { repetition_index: repetition },
    } as unknown as EvaluationScoreDocument);

  it('reports max - min per evaluator across repetitions', () => {
    expect(
      exampleSpreadByEvaluator([repDoc('Groundedness', 0, 0), repDoc('Groundedness', 20, 1)])
    ).toEqual({ Groundedness: 20 });
  });

  it('distinguishes a volatile cell from a stable one with the same mean', () => {
    const stable = [
      repDoc('Relevance', 10, 0),
      repDoc('Relevance', 10, 1),
      repDoc('Relevance', 10, 2),
    ];
    const volatile = [
      repDoc('Relevance', 0, 0),
      repDoc('Relevance', 10, 1),
      repDoc('Relevance', 20, 2),
    ];

    expect(exampleScoresByEvaluator(stable)).toEqual(exampleScoresByEvaluator(volatile));
    expect(exampleSpreadByEvaluator(stable)).toEqual({ Relevance: 0 });
    expect(exampleSpreadByEvaluator(volatile)).toEqual({ Relevance: 20 });
  });

  it('omits evaluators observed only once rather than claiming zero spread', () => {
    expect(exampleSpreadByEvaluator([repDoc('Factuality', 7, 0)])).toEqual({});
  });

  it('ignores documents with no numeric score', () => {
    const missing = { evaluator: { name: 'criteria' } } as unknown as EvaluationScoreDocument;
    expect(
      exampleSpreadByEvaluator([repDoc('criteria', 1, 0), missing, repDoc('criteria', 0, 1)])
    ).toEqual({ criteria: 1 });
  });
});

describe('countRepetitions', () => {
  const repDoc = (repetitionIndex: number | undefined): EvaluationScoreDocument =>
    ({ task: { repetition_index: repetitionIndex } } as EvaluationScoreDocument);

  it('counts distinct repetition indices', () => {
    expect(countRepetitions([repDoc(0), repDoc(0), repDoc(1), repDoc(2)])).toBe(3);
  });

  it('treats a missing index as repetition 0', () => {
    expect(countRepetitions([repDoc(undefined), repDoc(0)])).toBe(1);
  });
});

describe('queryMatrixTraces example fetching', () => {
  const completeDoc = (executionId: string): EvaluationScoreDocument =>
    ({
      example: { id: 'example-1' },
      evaluator: { name: 'Correctness', score: 1 },
      metadata: { execution_id: executionId },
      task: {
        model: { id: 'model-x' },
        output: { messages: [{ message: 'done' }] },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument);

  const makeClient = (opts: { filtered: boolean }) => {
    const getExampleScores = jest.fn(
      async (_exampleId: string, filters?: { executionId?: string }) =>
        // A legacy server ignores the filters and returns every execution.
        opts.filtered
          ? [completeDoc(filters?.executionId ?? 'exec-a')]
          : [completeDoc('exec-a'), completeDoc('exec-b')]
    );
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores,
    };
    return client;
  };

  const aggregatedFor = (experimentId: string) => [
    {
      modelId: 'model-x',
      suites: [{ suiteId: 'suite-1', experimentId, datasets: [], evaluators: [] }],
    },
  ];

  const logStub = {
    debug: jest.fn(),
    warning: jest.fn(),
  };

  it('round 8: applies the global scoring policy to suites without an override', async () => {
    // A self-judged doc (judge == graded model) that per-suite scoringBySuite does not
    // cover: only the global `config.scoring.excludeSelfJudged` rejects it. Passing
    // scoringBySuite alone re-admitted it into the trace cards.
    const selfJudgedDoc = {
      ...completeDoc('exec-a'),
      evaluator: { name: 'Correctness', score: 1, model: { id: 'model-x' } },
    } as unknown as EvaluationScoreDocument;
    const client = makeClient({ filtered: true });
    (client.getExampleScores as jest.Mock).mockImplementation(
      async (_e: string, filters?: { executionId?: string }) => [selfJudgedDoc]
    );
    void client;
    const independent = makeClient({ filtered: true });
    (independent.getExampleScores as jest.Mock).mockImplementation(async () => [selfJudgedDoc]);
    const traces = await queryMatrixTraces(
      independent as never,
      logStub as never,
      aggregatedFor('exec-a') as never,
      undefined,
      0,
      new Map(),
      undefined,
      undefined,
      { excludeSelfJudged: true }
    );
    // The trace entry (steps) may still exist, but its admitted scores must be
    // empty: the global policy rejected every score document.
    for (const entry of Object.values(traces)) {
      expect(entry.scores).toEqual({});
    }
    expect(Object.values(traces).length).toBeGreaterThan(0);
  });

  it('applies configured model aliases to the resolved trace keys', async () => {
    const client = makeClient({ filtered: true });
    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor('exec-a') as never,
      undefined,
      0,
      new Map([['openrouter-model-x', ['model-x']]])
    );
    expect(traces['model-x:direct:suite-1:example-1']).toBeDefined();
    expect(traces['openrouter-model-x:direct:suite-1:example-1']).toEqual(
      traces['model-x:direct:suite-1:example-1']
    );
  });

  it('arms the legacy fallback when a later response reveals unfiltered scores', async () => {
    // First response is empty (inconclusive); the second returns mixed executions.
    let call = 0;
    const getExampleScores = jest.fn(async () => {
      call += 1;
      return call === 1 ? [] : [completeDoc('exec-a'), completeDoc('exec-b')];
    });
    const client = {
      getExperimentScores: jest.fn(
        async () =>
          [
            { example: { id: 'example-1' } },
            { example: { id: 'example-2' } },
          ] as EvaluationScoreDocument[]
      ),
      getExampleScores,
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(client as never, log as never, aggregatedFor('exec-a') as never);

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Example-scores route ignores execution filters')
    );
  });

  it('counts an example resolved via a complete fallback as present, not missing', async () => {
    // Newest doc has a score but no `task.output` (incomplete); an older complete doc exists.
    const incomplete = {
      example: { id: 'example-1' },
      evaluator: { name: 'Correctness', score: 1 },
      metadata: { execution_id: 'exec-a' },
      task: { model: { id: 'model-x' }, repetition_index: 0 },
    } as unknown as EvaluationScoreDocument;

    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async () => [incomplete, completeDoc('exec-a')]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };

    const traces = await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never
    );

    // Regression: this used to return `complete === false`, so the caller reported the
    // example as missing even though a complete fallback trace had been installed.
    expect(log.warning).not.toHaveBeenCalledWith(
      expect.stringContaining('No complete score documents found')
    );
    expect(log.warning).not.toHaveBeenCalledWith(
      expect.stringContaining('Trace coverage incomplete')
    );
    expect(traces['model-x:direct:suite-1:example-1']).toBeDefined();
  });

  it('collects judge verdicts from the raw score documents it reads', async () => {
    const judged = {
      example: { id: 'example-1' },
      evaluator: { name: 'Correctness', score: 0.7, model: { id: 'judge-x' } },
      metadata: { execution_id: 'exec-a' },
      task: {
        model: { id: 'model-x' },
        output: { messages: [{ message: 'done' }] },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument;

    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async () => [judged]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    const judgeVerdicts: JudgeVerdict[] = [];

    await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never,
      undefined,
      0,
      new Map(),
      judgeVerdicts
    );

    // The CLI passes this array into renderReliabilityHtml; empty here would silently drop
    // the judge-agreement section from the reliability report.
    expect(judgeVerdicts).toEqual([
      {
        modelId: 'model-x',
        judgeId: 'judge-x',
        suiteId: 'suite-1',
        example: 'example-1',
        repetition: 0,
        evaluator: 'Correctness',
        score: 0.7,
      },
    ]);
  });

  it('reports runaway tool loops above the configured threshold', async () => {
    const heavy = (calls: number, trail: number): EvaluationScoreDocument =>
      ({
        example: { id: 'example-1' },
        evaluator: { name: 'Tool Calls', score: calls },
        metadata: { execution_id: 'exec-a' },
        task: {
          model: { id: 'model-x' },
          output: {
            messages: [{ message: 'done' }],
            steps: Array.from({ length: trail }, () => ({
              type: 'tool_call',
              tool_id: 'platform.core.search',
            })),
          },
          repetition_index: 0,
        },
      } as unknown as EvaluationScoreDocument);

    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async () => [heavy(44, 44)]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never,
      undefined,
      40
    );

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Possible runaway tool loops')
    );
  });

  it('does not cite a tool-call count the recorded trail cannot corroborate', async () => {
    const scoredWithTrail = (calls: number, trail: number): EvaluationScoreDocument =>
      ({
        example: { id: 'example-1' },
        evaluator: { name: 'Tool Calls', score: calls },
        metadata: { execution_id: 'exec-a' },
        task: {
          model: { id: 'model-x' },
          output: {
            messages: [{ message: 'done' }],
            steps: Array.from({ length: trail }, () => ({
              type: 'tool_call',
              tool_id: 'platform.core.search',
            })),
          },
          repetition_index: 0,
        },
      } as unknown as EvaluationScoreDocument);

    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async () => [scoredWithTrail(115, 29)]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never,
      undefined,
      40
    );

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining("'Tool Calls' exceeds the recorded tool trail")
    );
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('=115 (trail 29)'));
    expect(log.warning).not.toHaveBeenCalledWith(
      expect.stringContaining('Possible runaway tool loops')
    );
  });

  it('still reports a high count when no trail is available to refute it', async () => {
    const noTrailDoc = {
      example: { id: 'example-1' },
      evaluator: { name: 'Tool Calls', score: 115 },
      metadata: { execution_id: 'exec-a' },
      task: {
        model: { id: 'model-x' },
        output: { messages: [{ message: 'done' }] },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument;

    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async () => [noTrailDoc]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never,
      undefined,
      40
    );

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Possible runaway tool loops')
    );
  });

  it('does not report tool loops when the threshold is disabled', async () => {
    const client = makeClient({ filtered: true });
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(client as never, log as never, aggregatedFor('exec-a') as never);

    expect(log.warning).not.toHaveBeenCalledWith(
      expect.stringContaining('Possible runaway tool loops')
    );
  });

  it('does not treat an empty response as proof the server honours filters', async () => {
    const empty = jest.fn(async () => [] as EvaluationScoreDocument[]);
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: empty,
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(client as never, log as never, aggregatedFor('exec-a') as never);

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('Trace fetch returned no documents')
    );
  });

  it('stays quiet about total trace loss when documents do come back', async () => {
    const client = makeClient({ filtered: true });
    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(client as never, log as never, aggregatedFor('exec-a') as never);

    expect(log.warning).not.toHaveBeenCalledWith(
      expect.stringContaining('Trace fetch returned no documents')
    );
  });

  it('passes the execution filter to the example-scores route', async () => {
    const client = makeClient({ filtered: true });
    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor('exec-a') as never
    );
    expect(client.getExampleScores).toHaveBeenCalledWith('example-1', {
      executionId: 'exec-a',
      modelId: 'model-x',
    });
    expect(Object.keys(traces)).toContain('model-x:direct:suite-1:example-1');
  });

  it('detects an unfiltered (legacy) server and reuses the shared fetch across runs', async () => {
    const client = makeClient({ filtered: false });
    await queryMatrixTraces(
      client as never,
      logStub as never,
      [...aggregatedFor('exec-a'), ...aggregatedFor('exec-b')] as never
    );
    expect(client.getExampleScores).toHaveBeenCalledTimes(1);
  });

  it('serves cells from the trace cache without touching the server', async () => {
    const client = makeClient({ filtered: true });
    const traceCache = {
      'exec-a::example-1': [completeDoc('exec-a')],
    };
    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor('exec-a') as never,
      traceCache as never
    );
    expect(client.getExampleScores).not.toHaveBeenCalled();
    expect(traces['model-x:direct:suite-1:example-1']).toMatchObject({
      scores: { Correctness: 1 },
      repetitions: 1,
    });
  });

  it('does not duplicate the direct example key under prefix:<exampleId>', async () => {
    const client = makeClient({ filtered: true });
    const aggregated = [
      {
        modelId: 'model-x',
        suites: [
          {
            suiteId: 'suite-1',
            experimentId: 'exec-a',
            datasets: [{ datasetId: 'prefix:example-1' }],
            evaluators: [],
          },
        ],
      },
    ];
    const traces = await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    expect(Object.keys(traces)).toContain('model-x:direct:suite-1:example-1');
    expect(Object.keys(traces)).not.toContain('model-x:prefix:example-1');
  });

  it('fetches once per example on a legacy server even with many runs', async () => {
    const client = makeClient({ filtered: false });
    const aggregated = Array.from({ length: 6 }, (_, i) => aggregatedFor(`exec-${i}`)).flat();
    await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    expect(client.getExampleScores).toHaveBeenCalledTimes(1);
  });

  it('fans out over every execution id of a sharded suite row', async () => {
    const shardedDoc = (executionId: string, exampleId: string): EvaluationScoreDocument =>
      ({
        example: { id: exampleId },
        metadata: { execution_id: executionId },
        evaluator: { name: 'Correctness', score: 1 },
        task: {
          model: { id: 'model-x' },
          output: { messages: [{ message: 'done' }] },
          repetition_index: 0,
        },
      } as unknown as EvaluationScoreDocument);

    const getExperimentScores = jest.fn(
      async (_experimentId: string, { executionId }: { executionId?: string }) =>
        executionId === 'sweep-9-s1of2::suite::model-x'
          ? [shardedDoc('sweep-9-s1of2::suite::model-x', 'example-1')]
          : [shardedDoc('sweep-9-s2of2::suite::model-x', 'example-2')]
    );
    const getExampleScores = jest.fn(
      async (_exampleId: string, { executionId }: { executionId?: string }) => [
        shardedDoc(executionId ?? '?', _exampleId),
      ]
    );
    const client = { getExperimentScores, getExampleScores };
    const log = { debug: jest.fn(), warning: jest.fn() };

    const aggregated = [
      {
        modelId: 'model-x',
        suites: [
          {
            suiteId: 'suite-1',
            experimentId: 'sweep-9-s1of2::suite::model-x',
            executionIds: ['sweep-9-s1of2::suite::model-x', 'sweep-9-s2of2::suite::model-x'],
            datasets: [],
          },
        ],
      },
    ];

    await queryMatrixTraces(client as never, log as never, aggregated as never);

    expect(getExperimentScores).toHaveBeenCalledTimes(2);
    const enumeratedExecs = getExperimentScores.mock.calls.map((c) => c[1]?.executionId).sort();
    expect(enumeratedExecs).toEqual([
      'sweep-9-s1of2::suite::model-x',
      'sweep-9-s2of2::suite::model-x',
    ]);
    expect(log.warning).not.toHaveBeenCalledWith(
      expect.stringContaining('No complete score documents found')
    );
  });

  it('enumerates each shard under its own experiment id, not the row experimentId', async () => {
    const getExperimentScores = jest.fn(async () => []);
    const client = { getExperimentScores, getExampleScores: jest.fn(async () => []) };
    const log = { debug: jest.fn(), warning: jest.fn() };

    const aggregated = [
      {
        modelId: 'model-x',
        suites: [
          {
            suiteId: 'suite-1',
            experimentId: 'exp-shard-1',
            executions: [
              { experimentId: 'exp-shard-1', executionId: 'sweep-9-s1of2::suite::model-x' },
              { experimentId: 'exp-shard-2', executionId: 'sweep-9-s2of2::suite::model-x' },
            ],
            executionIds: ['sweep-9-s1of2::suite::model-x', 'sweep-9-s2of2::suite::model-x'],
            datasets: [],
          },
        ],
      },
    ];

    await queryMatrixTraces(client as never, log as never, aggregated as never);

    const calls = (
      getExperimentScores.mock.calls as unknown as Array<[string, { executionId?: string }]>
    )
      .map(([experimentId, { executionId }]) => `${experimentId}|${executionId}`)
      .sort();
    expect(calls).toEqual([
      'exp-shard-1|sweep-9-s1of2::suite::model-x',
      'exp-shard-2|sweep-9-s2of2::suite::model-x',
    ]);
  });

  it('fetches each (run, example) pair on a filtered server with no cross-run aliasing', async () => {
    const client = makeClient({ filtered: true });
    await queryMatrixTraces(
      client as never,
      logStub as never,
      [...aggregatedFor('exec-a'), ...aggregatedFor('exec-b')] as never
    );
    expect(client.getExampleScores).toHaveBeenCalledTimes(2);
    const executions = client.getExampleScores.mock.calls.map(([, f]) => f?.executionId).sort();
    expect(executions).toEqual(['exec-a', 'exec-b']);
  });

  // Regression (round-7): direct entries were keyed only by (model, example), so two
  // selected suites reusing an example ID overwrote each other — the last suite processed
  // won and the other's trace (and reliability reps) vanished.
  it('keeps per-suite direct cells when two suites reuse an example ID', async () => {
    const suiteDoc = (suiteId: string): EvaluationScoreDocument =>
      ({
        example: { id: 'shared-example' },
        evaluator: { name: 'Correctness', score: 1 },
        metadata: { execution_id: `exec-${suiteId}` },
        task: {
          model: { id: 'model-x' },
          output: { steps: [{ type: 'tool_call', tool_id: `tool-${suiteId}` }] },
          repetition_index: 0,
        },
      } as unknown as EvaluationScoreDocument);

    const client = {
      getExperimentScores: jest.fn(
        async (_experimentId: string, filters?: { suiteId?: string }) =>
          [{ example: { id: 'shared-example' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async (_exampleId: string, filters?: { executionId?: string }) => [
        suiteDoc(filters?.executionId === 'exec-s2' ? 's2' : 's1'),
      ]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    const aggregated = [
      {
        modelId: 'model-x',
        suites: [
          { suiteId: 's1', experimentId: 'exec-s1', datasets: [], evaluators: [] },
          { suiteId: 's2', experimentId: 'exec-s2', datasets: [], evaluators: [] },
        ],
      },
    ];

    const traces = await queryMatrixTraces(client as never, log as never, aggregated as never);

    expect(traces['model-x:direct:s1:shared-example']).toBeDefined();
    expect(traces['model-x:direct:s2:shared-example']).toBeDefined();
    expect(traces['model-x:direct:s1:shared-example'].toolTrail).toEqual(['tool-s1']);
    expect(traces['model-x:direct:s2:shared-example'].toolTrail).toEqual(['tool-s2']);
    // No bare (model, example) key may shadow the suite-scoped cells.
    expect(traces['model-x:shared-example']).toBeUndefined();
  });

  // Regression (round-7): the server-fetch path populated only repTrails, dropping
  // repAnswers and pathContract — so a normal --html run without --trace-cache could
  // not report answer similarity and classified every cell via the legacy prefix
  // heuristic, even though the same score documents carry all three fields.
  it('populates repAnswers and pathContract on the server-fetch path, not just the cache path', async () => {
    const rankableDoc: EvaluationScoreDocument = {
      example: { id: 'example-1', metadata: { pathContract: 'rankable' } },
      evaluator: { name: 'Correctness', score: 1 },
      metadata: { execution_id: 'exec-a' },
      task: {
        model: { id: 'model-x' },
        output: { steps: [{ type: 'tool_call', tool_id: 'search' }] },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument;

    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores: jest.fn(async () => [rankableDoc]),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    const traces = await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never
    );

    const cell = traces['model-x:direct:suite-1:example-1'];
    expect(cell.repTrails).toEqual([['search']]);
    expect(cell.pathContract).toBe('rankable');
    expect(cell.repAnswers).toEqual(['']);
  });

  it('bounds example-fetch concurrency and overlaps work across runs', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const getExampleScores = jest.fn(
      async (_exampleId: string, filters?: { executionId?: string }) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await new Promise((resolve) => setTimeout(resolve, 5));
        inFlight -= 1;
        return [completeDoc(filters?.executionId ?? 'exec-a')];
      }
    );
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores,
    };
    const aggregated = Array.from({ length: 12 }, (_, i) => aggregatedFor(`exec-${i}`)).flat();
    await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    // First pair runs alone for filter detection; the remaining 11 pool at ≤8.
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(8);
    expect(getExampleScores).toHaveBeenCalledTimes(12);
  });

  it('warns with model and example names when some scored cells lose their trace', async () => {
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }, { example: { id: 'example-2' } }] as never
      ),
      getExampleScores: jest.fn(async (exampleId: string) =>
        exampleId === 'example-1' ? [completeDoc('exec-a')] : []
      ),
    };
    const log = { debug: jest.fn(), warning: jest.fn() };
    const traces = await queryMatrixTraces(
      client as never,
      log as never,
      aggregatedFor('exec-a') as never
    );
    expect(Object.keys(traces)).toContain('model-x:direct:suite-1:example-1');
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('Trace coverage incomplete'));
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('example-2'));
    expect(log.warning).toHaveBeenCalledWith(expect.stringContaining('model-x'));
  });

  it('retries a transient fetch failure once before dropping the trace', async () => {
    let calls = 0;
    const getExampleScores = jest.fn(async () => {
      calls += 1;
      if (calls === 1) throw new Error('503 Service Unavailable');
      return [completeDoc('exec-a')];
    });
    const client = {
      getExperimentScores: jest.fn(
        async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
      ),
      getExampleScores,
    };
    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor('exec-a') as never
    );
    expect(getExampleScores).toHaveBeenCalledTimes(2);
    expect(Object.keys(traces)).toContain('model-x:direct:suite-1:example-1');
  });

  it('enumerates experiments concurrently in phase 1', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const getExperimentScores = jest.fn(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5));
      inFlight -= 1;
      return [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[];
    });
    const client = {
      getExperimentScores,
      getExampleScores: jest.fn(async () => [completeDoc('exec-a')]),
    };
    const aggregated = Array.from({ length: 8 }, (_, i) => aggregatedFor(`exec-${i}`)).flat();
    await queryMatrixTraces(client as never, logStub as never, aggregated as never);
    expect(maxInFlight).toBeGreaterThan(1);
    expect(maxInFlight).toBeLessThanOrEqual(6);
    expect(getExperimentScores).toHaveBeenCalledTimes(8);
  });

  it('flags a broken Tool Calls metric when the trail is non-empty but the score is 0', async () => {
    const zeroToolCallDoc = {
      example: { id: 'example-1' },
      evaluator: { name: 'Tool Calls', score: 0 },
      metadata: { execution_id: 'exec-a' },
      task: {
        model: { id: 'model-x' },
        output: {
          messages: [{ message: 'done' }],
          steps: [
            { type: 'tool_call', tool_id: 'load_skill' },
            { type: 'tool_call', tool_id: 'load_skill' },
          ],
        },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument;

    const log = { debug: jest.fn(), warning: jest.fn() };
    await queryMatrixTraces(
      makeClient({ filtered: true }) as never,
      log as never,
      aggregatedFor('exec-a') as never,
      { 'exec-a::example-1': [zeroToolCallDoc] } as never,
      40
    );

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining("'Tool Calls' reads 0 despite a non-empty tool trail")
    );
  });
});

describe('overlayRepeatedCacheTrails', () => {
  const scored = (model: string, toolId: string, repetition: number): EvaluationScoreDocument =>
    ({
      task: {
        model: { id: model },
        repetition_index: repetition,
        output: { steps: [{ type: 'tool_call', tool_id: toolId }] },
      },
    } as unknown as EvaluationScoreDocument);

  it('overlays the genuine 3-rep execution and ignores sibling 1-rep weekly runs', () => {
    const traces: MatrixTraceData = {
      'opus:workflow-authoring-a': { toolTrail: ['weekly'] },
    };
    overlayRepeatedCacheTrails(traces, {
      'old::security-persona-matrix::opus::workflow-authoring-a': [
        scored('opus', 'generate_workflow', 0),
        scored('opus', 'generate_workflow', 1),
        scored('opus', 'sml_search', 2),
      ],
      'weekly::security-persona-matrix::opus::workflow-authoring-a': [
        scored('opus', 'execute_api', 0),
      ],
    });
    expect(traces['opus:workflow-authoring-a'].repTrails).toEqual([
      ['generate_workflow'],
      ['generate_workflow'],
      ['sml_search'],
    ]);
  });

  it('does not invent repeats by concatenating two 1-rep executions', () => {
    const traces: MatrixTraceData = {};
    overlayRepeatedCacheTrails(traces, {
      'run-a::security-persona-matrix::gpt::workflow-authoring-a': [scored('gpt', 'search', 0)],
      'run-b::security-persona-matrix::gpt::workflow-authoring-a': [scored('gpt', 'load_skill', 0)],
    });
    expect(traces['gpt:workflow-authoring-a']).toBeUndefined();
  });
});

describe('aliasTraceKeys', () => {
  const entry = (stepCount: number) => ({ stepCount } as MatrixTraceData[string]);

  it('mirrors provider-keyed cells onto the row id for aliased models', () => {
    const traces: MatrixTraceData = {
      'deepseek/deepseek-v4-pro-0813:alert-analysis-a': entry(24),
      'deepseek/deepseek-v4-pro-0813:detection-rule-edit-b': entry(11),
    };
    aliasTraceKeys(
      traces,
      new Map([['openrouter-deepseek-v4-pro', ['deepseek/deepseek-v4-pro-0813']]])
    );
    expect(traces['openrouter-deepseek-v4-pro:alert-analysis-a']).toEqual(entry(24));
    expect(traces['openrouter-deepseek-v4-pro:detection-rule-edit-b']).toEqual(entry(11));
  });

  it('does not clobber a cell the row already resolved under its own id', () => {
    const traces: MatrixTraceData = {
      'row:alert-analysis-a': entry(5),
      'provider/slug:alert-analysis-a': entry(99),
    };
    aliasTraceKeys(traces, new Map([['row', ['provider/slug']]]));
    expect(traces['row:alert-analysis-a']).toEqual(entry(5));
  });

  it('leaves non-aliased (EIS) rows untouched', () => {
    const traces: MatrixTraceData = { 'anthropic-claude-4.5-haiku:alert-analysis-a': entry(7) };
    const before = { ...traces };
    aliasTraceKeys(traces, new Map());
    expect(traces).toEqual(before);
  });

  it('only rewrites the example suffix, not example ids containing the alias', () => {
    const traces: MatrixTraceData = { 'provider/slug:prefix:alert-analysis': entry(3) };
    aliasTraceKeys(traces, new Map([['row', ['provider/slug']]]));
    expect(traces['row:prefix:alert-analysis']).toEqual(entry(3));
  });
});

describe('aliasJudgeVerdicts', () => {
  const verdict = (
    modelId: string,
    judgeId = 'judge-x',
    score = 0.7,
    example = 'example-1',
    repetition = 0
  ): JudgeVerdict => ({
    modelId,
    judgeId,
    example,
    repetition,
    evaluator: 'Correctness',
    score,
  });

  it('mirrors an alias-scored verdict onto the configured row id', () => {
    // Regression: verdicts were left keyed by the provider-reported id only, so a row whose
    // scores came in under its alias rendered with no judge-agreement data.
    const verdicts = [verdict('provider/slug')];

    aliasJudgeVerdicts(verdicts, new Map([['row', ['provider/slug']]]));

    expect(verdicts.map((v) => v.modelId)).toEqual(['provider/slug', 'row']);
    expect(verdicts[1]).toEqual(verdict('row'));
  });

  it('leaves verdicts already keyed by the row id alone', () => {
    const verdicts = [verdict('row')];

    aliasJudgeVerdicts(verdicts, new Map([['row', ['provider/slug']]]));

    expect(verdicts).toEqual([verdict('row')]);
  });

  it('leaves non-aliased (EIS) verdicts untouched', () => {
    const verdicts = [verdict('eis/model')];

    aliasJudgeVerdicts(verdicts, new Map());

    expect(verdicts).toEqual([verdict('eis/model')]);
  });

  it('does not leak a mirrored verdict back onto another row sharing the alias', () => {
    // Two configured rows share one provider identity; each must keep only its own copy.
    const verdicts = [verdict('provider/slug')];

    aliasJudgeVerdicts(
      verdicts,
      new Map([
        ['row-a', ['provider/slug']],
        ['row-b', ['provider/slug']],
      ])
    );

    expect(verdicts.map((v) => v.modelId)).toEqual(['provider/slug', 'row-a', 'row-b']);
  });

  it('mirrors every verdict cell of an aliased run, not one per judge', () => {
    // Regression: deduping by (modelId, judgeId) alone copied at most one verdict per
    // judge onto the row, discarding the run's remaining examples/repetitions and
    // starving judge-agreement pairing of its sample.
    const verdicts = [
      verdict('provider/slug', 'judge-x', 1, 'ex-1', 0),
      verdict('provider/slug', 'judge-x', 0, 'ex-2', 0),
      verdict('provider/slug', 'judge-x', 1, 'ex-3', 1),
    ];

    aliasJudgeVerdicts(verdicts, new Map([['row', ['provider/slug']]]));

    const mirrored = verdicts.filter((v) => v.modelId === 'row');
    expect(mirrored).toHaveLength(3);
    expect(mirrored.map((v) => [v.example, v.repetition])).toEqual([
      ['ex-1', 0],
      ['ex-2', 0],
      ['ex-3', 1],
    ]);
  });
});

describe('round 7 regression: alias mirroring follows newest run', () => {
  it('overwrites a stale primary-ID direct trace when the alias run is newer', () => {
    const traces: MatrixTraceData = {
      'eis/model:alert-analysis-a': { steps: [], scores: { primary: 1 }, suiteId: 's1' },
      'provider/slug:alert-analysis-a': { steps: [], scores: { alias: 9 }, suiteId: 's1' },
    };
    aliasTraceKeys(
      traces,
      new Map([['eis/model', ['provider/slug']]]),
      new Map([['eis/model', new Map([['s1', 'provider/slug']])]])
    );
    expect(traces['eis/model:alert-analysis-a'].scores).toEqual({ alias: 9 });
  });

  it('keeps first-key-wins when the alias run is not the winner', () => {
    const traces: MatrixTraceData = {
      'eis/model:alert-analysis-a': { steps: [], scores: { primary: 1 }, suiteId: 's1' },
      'provider/slug:alert-analysis-a': { steps: [], scores: { alias: 9 }, suiteId: 's1' },
    };
    aliasTraceKeys(
      traces,
      new Map([['eis/model', ['provider/slug']]]),
      new Map([['eis/model', new Map([['s1', 'eis/model']])]])
    );
    expect(traces['eis/model:alert-analysis-a'].scores).toEqual({ primary: 1 });
  });
});

// Round 8 regression tests: verdicts and trace-card scores must mirror the matrix's
// admitted-document policy.
describe('round 8 review findings: trace policy filtering', () => {
  const policyDoc = (judgeId: string, score: number): EvaluationScoreDocument =>
    ({
      example: { id: 'example-1' },
      evaluator: { name: 'Correctness', score, model: { id: judgeId } },
      metadata: { execution_id: 'exec-a' },
      task: {
        model: { id: 'model-x' },
        output: { messages: [{ message: 'done' }] },
        repetition_index: 0,
      },
    } as unknown as EvaluationScoreDocument);

  const makeClient = (docs: EvaluationScoreDocument[]) => ({
    getExperimentScores: jest.fn(
      async () => [{ example: { id: 'example-1' } }] as EvaluationScoreDocument[]
    ),
    getExampleScores: jest.fn(async () => docs),
  });

  const logStub = { debug: jest.fn(), warning: jest.fn() };

  const aggregatedFor = () => [
    {
      modelId: 'model-x',
      suites: [
        {
          suiteId: 'suite-1',
          experimentId: 'exec-a',
          datasets: [],
          evaluators: [],
        },
      ],
    },
  ];

  it('excludes self-judged verdicts and scores when the suite policy excludes them', async () => {
    // Regression: the verdict loop and exampleScoresByEvaluator read every fetched
    // doc, so a self-judged verdict claimed cross-family judge agreement and a
    // rejected doc's raw score appeared on the prompt card.
    const client = makeClient([policyDoc('model-x', 0.1), policyDoc('eis-judge', 0.9)]);
    const judgeVerdicts: JudgeVerdict[] = [];

    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor() as never,
      undefined,
      0,
      new Map(),
      judgeVerdicts,
      { 'suite-1': { excludeSelfJudged: true } }
    );

    expect(judgeVerdicts).toEqual([
      {
        modelId: 'model-x',
        judgeId: 'eis-judge',
        suiteId: 'suite-1',
        example: 'example-1',
        repetition: 0,
        evaluator: 'Correctness',
        score: 0.9,
      },
    ]);
    expect(traces['model-x:direct:suite-1:example-1'].scores).toEqual({ Correctness: 0.9 });
  });

  it('keeps every verdict and score when no strict policy is configured', async () => {
    const client = makeClient([policyDoc('model-x', 0.1), policyDoc('eis-judge', 0.9)]);
    const judgeVerdicts: JudgeVerdict[] = [];

    const traces = await queryMatrixTraces(
      client as never,
      logStub as never,
      aggregatedFor() as never,
      undefined,
      0,
      new Map(),
      judgeVerdicts
    );

    expect(judgeVerdicts).toHaveLength(2);
    expect(traces['model-x:direct:suite-1:example-1'].scores).toEqual({
      Correctness: 0.5,
    });
  });
});
