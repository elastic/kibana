/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// CODE evaluator structure (names, shape, skip wrapper pattern) adapted from
// {@link ../../kbn-evals-suite-security-ai-rules/src/evaluate_dataset.ts}.
// createGapAddressedEvaluator and skipNoRule are specific to this suite.

import type {
  DefaultEvaluators,
  EvaluationDataset,
  EvalsExecutorClient,
  Evaluator,
} from '@kbn/evals';
import type { Client as TraceEsClient } from '@elastic/elasticsearch';
import type { EsClient } from '@kbn/scout';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleCreationExample } from '../../datasets/golden';
import type { RuleCreationClient, RuleCreationResult } from '../rule_creation_client';
import { createToolRoutingEvaluator } from './tool_routing';
import { logRunSummary, withScoreCollection, type ScoreSink } from './run_summary';
import {
  extractMitreTechniques,
  hasRequiredFields,
  resolveDateMathSeconds,
  validateEsqlSyntax,
  validateFromClause,
  validateInterval,
  validateRiskScore,
  validateSeverity,
  ordinalMitreF1,
  parentTechniqueId,
} from '../helpers';

export type RuleEvaluator = Evaluator<RuleCreationExample, RuleCreationResult>;

// Every evaluator below is a higher-is-better gate (1 = expectation met). Declared once
// here so each factory's object literal stays free of boilerplate.
export const RULE_EVALUATOR_DIRECTION = 'maximize' as const;

// ---------------------------------------------------------------------------
// Skip wrapper — returns N/A for any example where the workflow produced no rule
// ---------------------------------------------------------------------------

const NO_RULE_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation: 'No rule in output — workflow did not produce a draft_creation result',
};

const skipNoRule = (evaluator: RuleEvaluator): RuleEvaluator => ({
  ...evaluator,
  evaluate: async (args) => {
    if (!args.output?.rule) return NO_RULE_NA;
    return evaluator.evaluate(args);
  },
});

// ---------------------------------------------------------------------------
// CODE evaluators — deterministic, no LLM required
// ---------------------------------------------------------------------------

export const createQuerySyntaxValidityEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Query Syntax Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { query } = output.rule ?? {};
      if (!query) return { score: 0, metadata: { error: 'No query generated' } };
      const syntaxResult = await validateEsqlSyntax(query);
      if (!syntaxResult.valid)
        return { score: 0, metadata: { valid: false, error: syntaxResult.error } };
      const fromResult = validateFromClause(query);
      return {
        score: fromResult.valid ? 1 : 0,
        metadata: { valid: fromResult.valid, error: fromResult.error },
      };
    },
  });

export const createFieldCoverageEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Field Coverage',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { coverage, missing } = hasRequiredFields(output.rule ?? {});
      return { score: coverage, metadata: { coverage: `${Math.round(coverage * 100)}%`, missing } };
    },
  });

export const createRuleTypeLanguageEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Rule Type & Language',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { type, language } = output.rule ?? {};
      const typeOk = type === 'esql';
      const langOk = language === 'esql';
      return { score: typeOk && langOk ? 1 : 0, metadata: { type, language, typeOk, langOk } };
    },
  });

export const createMitreAccuracyEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'MITRE Accuracy',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      const generatedTechniques = extractMitreTechniques(output.rule ?? {});
      const expectedTechniques = new Set(expected.mitreIds);
      const optionalTechniques = new Set(expected.optionalMitreIds ?? []);

      // Optional techniques are credited, never required: including one must not be punished as a
      // false positive, and omitting one must not be punished as a miss.
      //
      // Exception: an optional technique that is the *parent* of a required sub-technique (e.g.
      // T1078 when T1078.001 is required) must be kept in the scored set so ordinalMitreF1 can
      // award the 0.5 parent-credit tier. Stripping it from the precision set (so the agent isn't
      // penalised for tagging only the sub) would leave generated empty, producing NaN precision
      // and an F1 of 0 — the opposite of the intended near-miss credit.
      const expectedParentsOfRequired = new Set(
        [...expectedTechniques].map(parentTechniqueId).filter((p): p is string => p != null)
      );
      const scoredTechniques = new Set(
        [...generatedTechniques].filter(
          (t) => !optionalTechniques.has(t) || expectedParentsOfRequired.has(t)
        )
      );

      // Ordinal F1: exact sub-technique = 1, parent-without-sub = 0.5. An
      // exact-ID set score treats "right family, imprecise member" the same as
      // garbage, which is exactly where the hard-cases 0.6x was hiding structure.
      const metrics = ordinalMitreF1(scoredTechniques, expectedTechniques);
      const invalidFormat = [...generatedTechniques].filter((t) => !/^T\d{4}(\.\d{3})?$/.test(t));
      return {
        score: metrics.f1,
        metadata: {
          precision: metrics.precision,
          recall: metrics.recall,
          f1: metrics.f1,
          partials: metrics.partials,
          generated: Array.from(generatedTechniques),
          expected: Array.from(expectedTechniques),
          optionalCredited: [...generatedTechniques].filter((t) => optionalTechniques.has(t)),
          invalidFormat,
        },
      };
    },
  });

export const createSeverityValidityEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Severity Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { severity } = output.rule ?? {};
      const valid = validateSeverity(severity);
      return { score: valid ? 1 : 0, metadata: { severity, valid } };
    },
  });

export const createRiskScoreValidityEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Risk Score Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { risk_score: riskScore } = output.rule ?? {};
      const valid = validateRiskScore(riskScore);
      return { score: valid ? 1 : 0, metadata: { riskScore, valid } };
    },
  });

export const createIntervalFormatEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Interval Format',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { interval } = output.rule ?? {};
      if (!interval) return { score: 0, metadata: { error: 'No interval set' } };
      const valid = validateInterval(interval);
      return { score: valid ? 1 : 0, metadata: { interval, valid } };
    },
  });

export const createLookbackGapEvaluator = (): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Lookback Gap',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { from, interval } = output.rule ?? {};
      const now = new Date();
      const fromSec = resolveDateMathSeconds(from, now);
      const intervalSec = interval ? resolveDateMathSeconds(`now-${interval}`, now) : null;
      if (fromSec === null || intervalSec === null) {
        return { score: 0, metadata: { error: 'Cannot parse from/interval', from, interval } };
      }
      // fromSec and intervalSec are both seconds-since-epoch. fromSec is further in the
      // past (smaller) when from reaches back far enough; intervalSec = now - interval.
      // A gap exists when from is more recent than now-interval, i.e. fromSec > intervalSec.
      const hasGap = fromSec > intervalSec;
      return { score: hasGap ? 0 : 1, metadata: { from, interval, fromSec, intervalSec, hasGap } };
    },
  });

export const createQueryExecutabilityEvaluator = (esClient: EsClient): RuleEvaluator =>
  skipNoRule({
    direction: RULE_EVALUATOR_DIRECTION,
    name: 'Query Executability',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { query } = output.rule ?? {};
      if (!query) return { score: 0, metadata: { error: 'No query generated' } };
      try {
        const result = await esClient.esql.query({ query });
        const rowCount = result.values?.length ?? 0;
        return { score: 1, metadata: { rowCount } };
      } catch (err) {
        // ES throws on unknown fields, index patterns that resolve to nothing, or type errors —
        // all of which indicate the agent hallucinated something the seeded data can't satisfy.
        const error = err instanceof Error ? err.message : String(err);
        return { score: 0, metadata: { error } };
      }
    },
  });

// ---------------------------------------------------------------------------
// LLM evaluators
// ---------------------------------------------------------------------------

// Future: add an ES|QL functional equivalence evaluator (createEsqlEquivalenceEvaluator
// from @kbn/evals) comparing the generated query against the reference esqlQuery in the
// golden dataset. The field is already present on RuleCreationExample for this purpose.
// Tradeoff: costs an extra LLM call per example, and the reference queries are synthetic
// (best-guess ground truth, not a real pre-existing rule), so signal is limited.

const GAP_ADDRESSED_CRITERIA = (
  technique: string,
  gap: string,
  ruleName: string,
  query: string
) => [
  `The generated ES|QL rule should specifically address the stated detection gap, not be a ` +
    `generic catch-all query. ` +
    `ATT&CK technique: "${technique}". ` +
    `Gap: "${gap}". ` +
    `Rule name: "${ruleName}". ` +
    `Rule query: "${query}". ` +
    `Score 1 if the rule targets the stated gap. Score 0 if it is off-target, overly generic ` +
    `(e.g. FROM * with no meaningful filters), or unrelated to the described technique.`,
];

export const createGapAddressedEvaluator = (
  evaluators: DefaultEvaluators,
  judgeProvenance?: { judgeConnectorId: string; judgeConnectorName?: string }
): RuleEvaluator => ({
  direction: RULE_EVALUATOR_DIRECTION,
  name: 'Gap Addressed',
  kind: 'LLM',
  evaluate: async ({ output, input, expected }) => {
    if (!output?.rule) return NO_RULE_NA;
    const { name = '', query = '' } = output.rule;
    const criteriaEval = evaluators.criteria(
      GAP_ADDRESSED_CRITERIA(input.technique, input.gap_description, name, query)
    );
    const result = await criteriaEval.evaluate({
      input,
      output: output.rule,
      expected,
      metadata: undefined,
    });
    // Judge provenance on every LLM-evaluated score: a self-judging model
    // (judge == subject) must be visible in the score document, not discovered
    // later by cross-referencing connector configs.
    return {
      ...result,
      metadata: {
        ...(result.metadata as Record<string, unknown> | undefined),
        ...(judgeProvenance ? { judge: judgeProvenance } : {}),
      },
    };
  },
});

// ---------------------------------------------------------------------------
// Dataset runner — shared wiring for all spec datasets
// ---------------------------------------------------------------------------

export const createEvaluateDataset =
  ({
    ruleCreationClient,
    evaluators,
    executorClient,
    esClient,
    traceEsClient,
    log,
    judgeProvenance,
  }: {
    ruleCreationClient: RuleCreationClient;
    evaluators: DefaultEvaluators;
    executorClient: EvalsExecutorClient;
    esClient: EsClient;
    traceEsClient: TraceEsClient;
    log: ToolingLog;
    judgeProvenance?: { judgeConnectorId: string; judgeConnectorName?: string };
  }) =>
  async ({
    dataset,
    evaluatorOverrides,
  }: {
    dataset: EvaluationDataset<RuleCreationExample>;
    /** Replaces the default evaluator list — used by the canary dataset's inverted expectation. */
    evaluatorOverrides?: RuleEvaluator[];
  }): Promise<void> => {
    const allEvaluators: RuleEvaluator[] = evaluatorOverrides ?? [
      createQuerySyntaxValidityEvaluator(),
      createFieldCoverageEvaluator(),
      createRuleTypeLanguageEvaluator(),
      createMitreAccuracyEvaluator(),
      createSeverityValidityEvaluator(),
      createRiskScoreValidityEvaluator(),
      createIntervalFormatEvaluator(),
      createLookbackGapEvaluator(),
      createQueryExecutabilityEvaluator(esClient),
      createToolRoutingEvaluator({ traceEsClient, log }),
      createGapAddressedEvaluator(evaluators, judgeProvenance),
    ];

    log.info(
      `Running rule creation evaluation: "${dataset.name}" (${dataset.examples.length} examples)`
    );

    // Observe every score so the run can state its own resolution limits.
    const sink: ScoreSink = new Map();
    await executorClient.runExperiment(
      {
        name: dataset.name,
        datasets: [dataset],
        task: async ({ input }) => ruleCreationClient.run({ input }),
      },
      withScoreCollection(allEvaluators, sink)
    );

    log.info(`Evaluation complete: "${dataset.name}"`);
    logRunSummary({ sink, datasetName: dataset.name, log });
  };
