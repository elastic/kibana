/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { CoverageCheckResult, CoverageExample, CoverageExpected } from './types';

export type CoverageEvaluator = Evaluator<CoverageExample, CoverageCheckResult>;

/** Which rule of the answer key the check returned. */
export type RuleMatch = 'primary' | 'alternate' | 'decoy' | 'other' | 'none';

const normalizeName = (name: string): string => name.trim().toLowerCase();

export const classifyRuleMatch = (
  { ruleId, ruleName }: Pick<CoverageCheckResult, 'ruleId' | 'ruleName'>,
  { primaryRule, alternateRuleNames, decoyRuleNames }: CoverageExpected
): RuleMatch => {
  if (!ruleId && !ruleName) {
    return 'none';
  }
  const name = normalizeName(ruleName ?? '');
  const isNamed = (names: string[]): boolean => names.some((n) => normalizeName(n) === name);

  if (primaryRule && (ruleId === primaryRule.ruleId || isNamed([primaryRule.name]))) {
    return 'primary';
  }
  if (isNamed(alternateRuleNames)) {
    return 'alternate';
  }
  if (isNamed(decoyRuleNames)) {
    return 'decoy';
  }
  return 'other';
};

const CHECK_FAILED = (output: CoverageCheckResult) => ({
  score: 0,
  label: 'check_failed',
  explanation: output.checkError ?? 'The check returned no verdict',
});

/** 1 when the check returned the expected verdict. */
export const createVerdictEvaluator = (): CoverageEvaluator => ({
  name: 'Verdict',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (output.checkFailed) {
      return CHECK_FAILED(output);
    }
    const correct = output.verdict === expected?.verdict;
    return {
      score: correct ? 1 : 0,
      label: output.verdict ?? 'none',
      explanation: correct
        ? `Verdict ${output.verdict}`
        : `Expected ${expected?.verdict}, got ${output.verdict}`,
    };
  },
});

/**
 * 1 when the check named the primary rule or an acceptable alternate. A decoy or any other
 * rule scores 0. The label tells which one it was.
 */
export const createRuleMatchEvaluator = (): CoverageEvaluator => ({
  name: 'Rule Match',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (output.checkFailed) {
      return CHECK_FAILED(output);
    }
    if (!expected.primaryRule) {
      return { score: null, label: 'N/A', explanation: 'The example expects no rule' };
    }
    const match = classifyRuleMatch(output, expected);
    return {
      score: match === 'primary' || match === 'alternate' ? 1 : 0,
      label: match,
      explanation: `Got "${output.ruleName ?? ''}" (${output.ruleId ?? 'no id'}). Primary is "${
        expected.primaryRule.name
      }".`,
    };
  },
});

/**
 * With `prebuilt_available`, the review installs the rule at `prebuilt_version`. A version of 0
 * sends the review to a report instead of an install proposal, so the analyst cannot act.
 */
export const createInstallableEvaluator = (): CoverageEvaluator => ({
  name: 'Installable',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    if (output.checkFailed || output.verdict !== 'prebuilt_available') {
      return { score: null, label: 'N/A', explanation: 'Only scored for prebuilt_available' };
    }
    const installable = (output.prebuiltVersion ?? 0) > 0;
    return {
      score: installable ? 1 : 0,
      label: installable ? 'versioned' : 'no_version',
      explanation: `prebuilt_version=${output.prebuiltVersion ?? 'missing'}`,
    };
  },
});

export const createCoverageEvaluators = (): CoverageEvaluator[] => [
  createVerdictEvaluator(),
  createRuleMatchEvaluator(),
  createInstallableEvaluator(),
];
