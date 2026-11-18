/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';

import type { Evaluator, EvalsExecutorClient } from '@kbn/evals';
import { analysisOutputValidator } from './contracts';
import { replayOnce, scoreOnce } from './report_once';
import {
  benignVerdictEvaluator,
  checkBenignVerdict,
  checkContainmentProposed,
  containmentProposedEvaluator,
  type ContainmentProposedContext,
} from './verdict_checks';

interface Logger {
  info: (message: string) => void;
}

interface ReportArgs {
  executorClient: EvalsExecutorClient;
  log: Logger;
  caseName: string;
  structuredOutput: unknown;
}

/**
 * Same replay-once executor pattern as `reportActionSafety`: one observed output, scored on
 * the first repetition only, keyed by a per-invocation observation id.
 */
const runScoreExperiment = async ({
  executorClient,
  caseName,
  structuredOutput,
  evaluator,
  slug,
  description,
  expected,
}: Omit<ReportArgs, 'log'> & {
  evaluator: Evaluator;
  slug: string;
  description: string;
  expected: Record<string, unknown>;
}) => {
  const observationId = randomUUID();
  await executorClient.runExperiment(
    {
      name: `alertzero-endpoint-analysis-${slug}: ${caseName} (${observationId})`,
      datasets: [
        {
          name: `alertzero-endpoint-analysis-${slug}: ${caseName}`,
          description: `${description} (${caseName}).`,
          examples: [{ input: { caseName, observationId }, output: expected, metadata: null }],
        },
      ],
      task: replayOnce(structuredOutput) as () => Promise<never>,
    },
    [scoreOnce(evaluator)]
  );
};

/**
 * Scores `ContainmentProposed` for the conclusive fixture and logs
 * `ContainmentProposed: <pass|fail> verdict=<v> propose=<bool> actions=<types|none>`.
 * Never throws on a failed check; callers keep the hard assertion and run it after this.
 */
export const reportContainmentProposed = async ({
  context,
  log,
  ...args
}: ReportArgs & { context: ContainmentProposedContext }): Promise<string[]> => {
  // A missing or malformed output has no score to report: the hard assertion surfaces it.
  if (!analysisOutputValidator.safeParse(args.structuredOutput).success) {
    log.info(`ContainmentProposed: not scored, ${args.caseName} has no valid structured output`);
    return [];
  }
  const { failures, verdict, propose, actionTypes } = checkContainmentProposed(
    args.structuredOutput,
    context
  );
  log.info(
    `ContainmentProposed: ${
      failures.length === 0 ? 'pass' : 'fail'
    } verdict=${verdict} propose=${propose} actions=${actionTypes.join(',') || 'none'}`
  );
  await runScoreExperiment({
    ...args,
    evaluator: containmentProposedEvaluator,
    slug: 'containment-proposed',
    description:
      'Zero-tolerance check that a conclusive Endpoint Analysis proposes containment of the investigated host',
    expected: { endpointIds: context.endpointIds },
  });
  return failures;
};

/**
 * Scores `BenignVerdict` for the benign fixture and logs `BenignVerdict: <pass|fail> verdict=<v>`.
 * Never throws on a failed check; callers keep the hard assertion and run it after this.
 */
export const reportBenignVerdict = async ({ log, ...args }: ReportArgs): Promise<string[]> => {
  if (!analysisOutputValidator.safeParse(args.structuredOutput).success) {
    log.info(`BenignVerdict: not scored, ${args.caseName} has no valid structured output`);
    return [];
  }
  const { failures, verdict } = checkBenignVerdict(args.structuredOutput);
  log.info(`BenignVerdict: ${failures.length === 0 ? 'pass' : 'fail'} verdict=${verdict}`);
  await runScoreExperiment({
    ...args,
    evaluator: benignVerdictEvaluator,
    slug: 'benign-verdict',
    description: 'Zero-tolerance check that a benign host is not labelled confirmed_incident',
    expected: {},
  });
  return failures;
};
