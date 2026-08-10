/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// CODE evaluator structure (names, shape, skip wrapper pattern) adapted from
// {@link ../../kbn-evals-suite-security-ai-rules/src/evaluate_dataset.ts}.
// createGapAddressedEvaluator and skipNoRule are specific to this suite.

import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type { RuleCreationExample } from '../datasets/rule_creation_golden';
import type { RuleCreationResult } from './rule_creation_client';
import {
  calculateSetMetrics,
  extractMitreTechniques,
  hasRequiredFields,
  resolveDateMathSeconds,
  validateEsqlSyntax,
  validateFromClause,
  validateInterval,
  validateRiskScore,
  validateSeverity,
} from './helpers';

type RuleEvaluator = Evaluator<RuleCreationExample, RuleCreationResult>;

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
    name: 'Field Coverage',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { coverage, missing } = hasRequiredFields(output.rule ?? {});
      return { score: coverage, metadata: { coverage: `${Math.round(coverage * 100)}%`, missing } };
    },
  });

export const createRuleTypeLanguageEvaluator = (): RuleEvaluator =>
  skipNoRule({
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
    name: 'MITRE Accuracy',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      const generatedTechniques = extractMitreTechniques(output.rule ?? {});
      const expectedTechniques = new Set(expected.mitreIds);
      const metrics = calculateSetMetrics(generatedTechniques, expectedTechniques);
      const invalidFormat = [...generatedTechniques].filter((t) => !/^T\d{4}(\.\d{3})?$/.test(t));
      return {
        score: metrics.f1,
        metadata: {
          precision: metrics.precision,
          recall: metrics.recall,
          f1: metrics.f1,
          generated: Array.from(generatedTechniques),
          expected: Array.from(expectedTechniques),
          invalidFormat,
        },
      };
    },
  });

export const createSeverityValidityEvaluator = (): RuleEvaluator =>
  skipNoRule({
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
      const hasGap = fromSec < intervalSec;
      return { score: hasGap ? 0 : 1, metadata: { from, interval, fromSec, intervalSec, hasGap } };
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

export const createGapAddressedEvaluator = (evaluators: DefaultEvaluators): RuleEvaluator => ({
  name: 'Gap Addressed',
  kind: 'LLM',
  evaluate: async ({ output, input, expected }) => {
    if (!output?.rule) return NO_RULE_NA;
    const { name = '', query = '' } = output.rule;
    const criteriaEval = evaluators.criteria(
      GAP_ADDRESSED_CRITERIA(input.technique, input.gap_description, name, query)
    );
    return criteriaEval.evaluate({ input, output: output.rule, expected, metadata: undefined });
  },
});
