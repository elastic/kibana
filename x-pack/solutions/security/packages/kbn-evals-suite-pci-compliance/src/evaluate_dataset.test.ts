/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type {
  DatasetRunResult,
  DefaultEvaluators,
  Evaluator,
  EvalsExecutorClient,
} from '@kbn/evals';
import type { PciEvalChatClient } from './chat_client';
import { MAX_PROMPT_TURNS } from './chat_client';
import { createEvaluatePciDataset, createPciCriteriaEvaluator } from './evaluate_dataset';

const UNANSWERED_PROMPT_MARKER = '[UNANSWERED_PROMPT]';

const answeredOutput = {
  messages: [
    { message: 'Run the brute-force check.' },
    { message: 'Requirement 8.3.4 is RED: 12 failed logins for jdoe.' },
  ],
  steps: [],
  errors: [],
  unansweredPrompt: false,
};

const pausedOutput = {
  messages: [
    { message: 'Map the non-ECS fields.' },
    { message: `${UNANSWERED_PROMPT_MARKER} the agent paused on confirmation prompt(s) ...` },
  ],
  steps: [],
  errors: [],
  unansweredPrompt: true,
};

const makeEvaluators = (judgeResult = { score: 1, label: null, explanation: 'judged' }) => {
  const judge = jest.fn().mockResolvedValue(judgeResult);
  const evaluators = {
    criteria: jest.fn(() => ({
      name: 'criteria',
      kind: 'LLM',
      direction: 'maximize',
      evaluate: judge,
    })) as unknown as DefaultEvaluators['criteria'],
  } as DefaultEvaluators;

  return { evaluators, judge };
};

describe('createPciCriteriaEvaluator', () => {
  const evaluateWith = async (output: unknown) => {
    const { evaluators, judge } = makeEvaluators();
    const evaluator = createPciCriteriaEvaluator({ evaluators }) as Evaluator;

    const result = await evaluator.evaluate({
      input: { question: 'Map the non-ECS fields.' },
      output,
      expected: { criteria: ['Mapped every non-ECS field.'] },
      metadata: null,
    });

    return { result, judge };
  };

  it('judges a round that produced an answer', async () => {
    const { result, judge } = await evaluateWith(answeredOutput);

    expect(judge).toHaveBeenCalledTimes(1);
    expect(result.score).toBe(1);
  });

  // The bug this pins: a round that ended on an unanswered prompt has no answer, so scoring its
  // transcript (0.909 measured the client, not the model) must not happen. It is reported as
  // unscored - never as a score.
  it('reports an unanswered-prompt round as unscored instead of judging the transcript', async () => {
    const { result, judge } = await evaluateWith(pausedOutput);

    expect(judge).not.toHaveBeenCalled();
    expect(result.score).toBeNull();
    expect(result.label).toBe('unanswered_prompt');
    expect(result.explanation).toContain(UNANSWERED_PROMPT_MARKER);
  });
});

describe('createEvaluatePciDataset', () => {
  const buildHarness = (unanswered: boolean[]) => {
    const conversationResults = unanswered.map((isUnanswered) => ({
      unansweredPrompt: isUnanswered,
      promptTurns: isUnanswered ? MAX_PROMPT_TURNS : 0,
      messages: isUnanswered ? pausedOutput.messages : answeredOutput.messages,
      steps: [],
      errors: [],
      traceId: 'trace-1',
    }));

    let taskIndex = 0;
    const chatClient = {
      converse: jest.fn(async () => conversationResults[taskIndex++ % conversationResults.length]),
    } as unknown as PciEvalChatClient;

    const runExperiment = jest.fn(async (options) => {
      const runs: Record<string, unknown> = {};
      for (const [index, example] of options.datasets[0].examples.entries()) {
        runs[`${index}:0`] = {
          exampleIndex: index,
          repetition: 0,
          input: example.input,
          expected: example.output,
          metadata: example.metadata,
          output: await options.task(example),
        };
      }

      return [
        {
          id: 'experiment-1',
          experimentName: 'pci',
          datasetId: 'dataset-1',
          datasetName: options.datasets[0].name,
          runs,
          evaluationRuns: [],
        } as unknown as DatasetRunResult,
      ];
    });

    const log = { info: jest.fn(), warning: jest.fn(), error: jest.fn() } as unknown as ToolingLog;

    const evaluatePciDataset = createEvaluatePciDataset({
      evaluators: makeEvaluators().evaluators,
      executorClient: { runExperiment } as unknown as EvalsExecutorClient,
      chatClient,
      traceEsClient: {} as never,
      log,
    });

    return { evaluatePciDataset, runExperiment, log };
  };

  const dataset = (examples: number) => ({
    name: 'pci-compliance: field mapping',
    description: 'field mapping',
    examples: Array.from({ length: examples }, (_, index) => ({
      input: { question: `question ${index}` },
      output: { criteria: [`criterion ${index}`] },
    })),
  });

  it('carries the client pause state into the task output for every round', async () => {
    const { evaluatePciDataset, runExperiment } = buildHarness([false, true]);

    await evaluatePciDataset({ dataset: dataset(2) });

    const [experiment] = await runExperiment.mock.results[0].value;
    const outputs = Object.values(experiment.runs as Record<string, { output: unknown }>).map(
      (run) => run.output as { unansweredPrompt: boolean }
    );

    expect(outputs.map((output) => output.unansweredPrompt)).toEqual([false, true]);
  });

  it('reports paused rounds as paused k/n next to the suite score', async () => {
    const { evaluatePciDataset, log } = buildHarness([false, true]);

    await evaluatePciDataset({ dataset: dataset(2) });

    expect(log.warning).toHaveBeenCalledWith(
      expect.stringContaining('paused 1/2 for "pci-compliance: field mapping"')
    );
  });

  it('reports paused 0/n when every round produced an answer', async () => {
    const { evaluatePciDataset, log } = buildHarness([false]);

    await evaluatePciDataset({ dataset: dataset(2) });

    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('paused 0/2'));
  });
});
