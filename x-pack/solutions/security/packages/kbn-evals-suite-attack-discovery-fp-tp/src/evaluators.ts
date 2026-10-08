/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { createTrajectoryEvaluator } from '@kbn/evals';
import { ExecutionStatus } from '@kbn/workflows';
import {
  FP_TP_VERDICTS,
  RATIONALE_MARKDOWN_MAX_LENGTH,
  SUMMARY_MARKDOWN_MAX_LENGTH,
  type FpTpOutcome,
} from './constants';
import type { FpTpTaskOutput } from './workflow_task';

interface ExpectedOutcome {
  outcome: FpTpOutcome;
}

const asOutput = (output: unknown): FpTpTaskOutput => output as FpTpTaskOutput;
const expectedOutcome = (expected: unknown): FpTpOutcome | undefined =>
  (expected as ExpectedOutcome | undefined)?.outcome;

/**
 * Primary metric: does the run's outcome match the gold outcome? A `failed` gold also
 * needs an explicit FAILED execution, so a timeout or cancellation cannot stand in for
 * the required-source guard. The label is the predicted outcome, so the report reads
 * as a confusion matrix.
 */
export const outcomeAccuracy: Evaluator = {
  name: 'OutcomeAccuracy',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const { outcome: predicted, executionStatus } = asOutput(output);
    const gold = expectedOutcome(expected);
    const matches =
      predicted !== undefined &&
      predicted === gold &&
      (gold !== 'failed' || executionStatus === ExecutionStatus.FAILED);
    return {
      score: matches ? 1 : 0,
      label: predicted ?? 'none',
      explanation: `predicted="${predicted ?? 'none'}" expected="${gold ?? 'none'}"`,
      metadata: {
        predicted: predicted ?? null,
        expected: gold ?? null,
        executionStatus,
      },
    };
  },
};

/**
 * The costly error: `false_positive` closes the attack, so predicting it when the gold
 * is anything else scores 0.
 */
export const unsafeClose: Evaluator = {
  name: 'UnsafeClose',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const predicted = asOutput(output).outcome;
    const gold = expectedOutcome(expected);
    const unsafe = predicted === 'false_positive' && gold !== 'false_positive';
    return {
      score: unsafe ? 0 : 1,
      label: unsafe ? 'unsafe_close' : 'safe',
      explanation: `predicted="${predicted ?? 'none'}" expected="${gold ?? 'none'}"`,
    };
  },
};

/** The world checks the managed prompt requires in `raw.checks`. */
const WORLD_CHECK_NAMES = ['entity_role', 'process_parent', 'network_destination'] as const;

interface RawCheck {
  name?: string;
  status?: string;
  result?: string;
}

interface RawCoverage {
  seen?: number;
  truncated?: boolean;
}

/**
 * Contract-derived problems computable from `raw` without a model — each one is
 * something a well-formed but wrong answer can still violate. Mirrors the managed
 * workflow's `coverage.*` shape (`seen`/`cap`/`truncated`; a failed or empty query
 * is `seen: 0`) and the prompt's verdict rules 1-4, which the managed YAML states
 * as: (1) world checks both support and contradict → inconclusive; (2) at least one
 * world check contradicts, none supports, and both sources have hits → false_positive;
 * (3) process_parent or network_destination supports and no world check contradicts →
 * true_positive; (4) anything else → inconclusive. A `block_truncated_clear` downgrade
 * emits verdict `inconclusive` with no `checks`/`claims` at all, so the presence check
 * only applies when checks would be present; a model's own inconclusive still emits
 * checks, so a truncation downgrade is only the `checks === undefined` shape.
 */
const contractProblems = (output: FpTpTaskOutput): string[] => {
  const { payload, raw } = output;
  if (!payload || !raw) {
    return [];
  }
  const problems: string[] = [];
  const coverage = (raw.coverage ?? {}) as Record<string, RawCoverage | undefined>;
  const sourceSeen = (source: string): number => Number(coverage[source]?.seen ?? 0);

  // A truncation downgrade emits verdict `inconclusive` with no checks at all; a
  // model's own inconclusive emits checks, so they are still required there.
  const downgraded =
    payload.verdict === 'inconclusive' &&
    (coverage.entities?.truncated === true || coverage.events?.truncated === true) &&
    raw.checks === undefined;

  const checks = (raw.checks ?? []) as RawCheck[];
  if (!downgraded) {
    const present = new Set(checks.map(({ name }) => name));
    for (const name of WORLD_CHECK_NAMES) {
      if (!present.has(name)) {
        problems.push(`checks is missing "${name}"`);
      }
    }
  }

  if (payload.verdict === 'false_positive') {
    // "Missing evidence cannot clear an alert": a failed or empty query yields
    // `seen: 0` (or no coverage entry at all) for that source.
    if (sourceSeen('entities') === 0 || sourceSeen('events') === 0) {
      problems.push('false_positive with missing evidence');
    }
  }

  // Completed world checks only; skipped checks carry no result and never count, and
  // the prompt scopes the rules to the world checks: entity_role, process_parent,
  // and network_destination (alert_linkage never decides a verdict).
  const worldResults = new Set(
    checks
      .filter(
        ({ name, status }) =>
          (WORLD_CHECK_NAMES as readonly string[]).includes(name ?? '') &&
          (status === undefined || status === 'completed')
      )
      .map(({ result }) => result)
  );

  // Rule 1: world checks both support and contradict -> the verdict is inconclusive,
  // whatever the run decided.
  if (
    (payload.verdict === 'false_positive' || payload.verdict === 'true_positive') &&
    worldResults.has('supports') &&
    worldResults.has('contradicts')
  ) {
    problems.push(`${payload.verdict} contradicts rule 1: checks both support and contradict`);
  }

  // Rule 2: false_positive needs at least one world check contradicting and none
  // supporting. Missing evidence is checked separately above.
  if (
    payload.verdict === 'false_positive' &&
    (!worldResults.has('contradicts') || worldResults.has('supports'))
  ) {
    problems.push('false_positive contradicts rule 2: no world check supports may remain');
  }

  // Rule 3: true_positive needs process_parent or network_destination supporting, and
  // no world check contradicting; entity_role/alert_linkage support alone is not enough.
  if (payload.verdict === 'true_positive') {
    const checkResult = (name: string) =>
      checks.find(({ name: n, status }) => n === name && (status ?? 'completed') === 'completed')
        ?.result;
    const decidingSupports = ['process_parent', 'network_destination'].some(
      (name) => checkResult(name) === 'supports'
    );
    if (!decidingSupports) {
      problems.push(
        'true_positive contradicts rule 3: process_parent or network_destination must support'
      );
    }
    if (worldResults.has('contradicts')) {
      problems.push('true_positive contradicts rule 3: a world check contradicts');
    }
  }
  return problems;
};

const payloadProblems = (output: FpTpTaskOutput, attackDiscoveryId: string): string[] => {
  const { payload, attackDiscoveryIdEcho } = output;
  if (!payload) {
    return ['no payload'];
  }
  const problems: string[] = [];
  if (output.executionStatus !== ExecutionStatus.COMPLETED) {
    problems.push(`execution ended ${output.executionStatus}, not completed`);
  }
  if (!FP_TP_VERDICTS.some((verdict) => verdict === payload.verdict)) {
    problems.push(`unsupported verdict "${payload.verdict}"`);
  }
  const summary = payload.summary_markdown ?? '';
  if (summary.trim() === '') {
    problems.push('empty summary_markdown');
  }
  if (summary.length > SUMMARY_MARKDOWN_MAX_LENGTH) {
    problems.push(`summary_markdown longer than ${SUMMARY_MARKDOWN_MAX_LENGTH}`);
  }
  if ((payload.rationale_markdown?.length ?? 0) > RATIONALE_MARKDOWN_MAX_LENGTH) {
    problems.push(`rationale_markdown longer than ${RATIONALE_MARKDOWN_MAX_LENGTH}`);
  }
  if (attackDiscoveryIdEcho !== attackDiscoveryId) {
    problems.push(`attack_discovery_id "${attackDiscoveryIdEcho}" does not echo the input`);
  }
  problems.push(...contractProblems(output));
  return problems;
};

const failureProblems = (output: FpTpTaskOutput): string[] => [
  ...(output.executionStatus !== ExecutionStatus.FAILED
    ? [`execution ended ${output.executionStatus}, not failed`]
    : []),
  ...(output.payload ? ['payload produced by a run that should have failed'] : []),
];

/**
 * Contract conformance. A run whose gold is `failed` must end FAILED (not timed out or
 * cancelled) and produce no payload;
 * any other run must produce a payload that satisfies the output contract.
 */
export const payloadConformance: Evaluator = {
  name: 'PayloadConformance',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const task = asOutput(output);
    const problems =
      expectedOutcome(expected) === 'failed'
        ? failureProblems(task)
        : payloadProblems(task, task.seededIds.attackDiscoveryId);
    return {
      score: problems.length === 0 ? 1 : 0,
      label: problems.length === 0 ? 'conforms' : 'violates',
      explanation: problems.length === 0 ? null : problems.join('; '),
    };
  },
};

/**
 * Zero-tool guardrail: the workflow gathers the evidence and the agent is tool-less, so
 * any tool call fails. N/A when the traces are unavailable.
 */
export const createFpTpTrajectoryEvaluator = (): Evaluator => {
  const inner = createTrajectoryEvaluator({
    extractToolCalls: (output) => asOutput(output).toolCallIds ?? [],
    goldenPathExtractor: () => [],
    orderWeight: 1,
    coverageWeight: 0,
  });

  return {
    ...inner,
    name: 'trajectory',
    evaluate: async (args) => {
      if (asOutput(args.output).toolCallsUnavailable) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Workflow trace unavailable — skipping trajectory evaluation.',
        };
      }
      return inner.evaluate(args);
    },
  };
};

/** Reports N/A for failed runs, which have no summary or rationale to judge. */
export const skipFailedRuns = (evaluator: Evaluator): Evaluator => ({
  ...evaluator,
  evaluate: async (args) => {
    if (asOutput(args.output).outcome === 'failed') {
      return {
        score: null,
        label: 'N/A',
        explanation: 'The run failed, so there is no summary or rationale to judge.',
      };
    }
    return evaluator.evaluate(args);
  },
});
