/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import type {
  DefaultEvaluators,
  EvaluationCriterionStructured,
  EvaluationResult,
  Evaluator,
} from '@kbn/evals';
import { RuleLookup, type RuleEvidence } from './rule_evidence';
import type {
  CoverageCheckResult,
  CoverageExample,
  CoverageExpected,
  CoverageIndicator,
} from './types';

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

const CHECK_FAILED = (output: CoverageCheckResult): EvaluationResult => ({
  score: 0,
  label: 'check_failed',
  explanation: output.checkError ?? 'The check returned no verdict',
});

const errorMessage = (err: unknown): string => (err instanceof Error ? err.message : String(err));

// A thrown error ends the whole experiment, so a failed read scores this example as unknown.
const LOOKUP_FAILED = (ruleId: string, err: unknown): EvaluationResult => ({
  score: null,
  label: 'lookup_error',
  explanation: `Could not read rule ${ruleId}: ${errorMessage(err)}`,
});

type RuleRead = { rule: RuleEvidence | undefined } | { error: EvaluationResult };

const readRule = async (rules: RuleLookup, ruleId: string): Promise<RuleRead> => {
  try {
    return { rule: await rules.find(ruleId) };
  } catch (err) {
    return { error: LOOKUP_FAILED(ruleId, err) };
  }
};

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
 * 1 when the rule that `rule_id` points to is the primary rule or an acceptable alternate. The
 * proposal acts on `rule_id`, so the evaluator reads the rule by its id and ignores the name the
 * check wrote. An id that points to no rule, a decoy, or any other rule scores 0.
 */
export const createRuleMatchEvaluator = (rules: RuleLookup): CoverageEvaluator => ({
  name: 'Rule Match',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    if (output.checkFailed) {
      return CHECK_FAILED(output);
    }
    const { primaryRule } = expected;
    if (!primaryRule) {
      return { score: null, label: 'N/A', explanation: 'The example expects no rule' };
    }
    if (!output.ruleId) {
      return { score: 0, label: 'none', explanation: 'The check returned no rule_id' };
    }
    const read = await readRule(rules, output.ruleId);
    if ('error' in read) {
      return read.error;
    }
    if (!read.rule) {
      return {
        score: 0,
        label: 'unknown_id',
        explanation: `No installed or prebuilt rule has rule_id ${
          output.ruleId
        }. The check named "${output.ruleName ?? ''}".`,
      };
    }
    const match = classifyRuleMatch({ ruleId: output.ruleId, ruleName: read.rule.name }, expected);
    return {
      score: match === 'primary' || match === 'alternate' ? 1 : 0,
      label: match,
      explanation: `rule_id ${output.ruleId} is "${read.rule.name}". Primary is "${primaryRule.name}".`,
      metadata: {
        nameMatchesId: normalizeName(read.rule.name) === normalizeName(output.ruleName ?? ''),
      },
    };
  },
});

/**
 * With `prebuilt_available`, the proposal installs `rule_id` at `prebuilt_version`. That works
 * only for a catalog rule that is not installed yet, at the version the catalog has.
 */
export const createInstallableEvaluator = (rules: RuleLookup): CoverageEvaluator => ({
  name: 'Installable',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    if (output.checkFailed || output.verdict !== 'prebuilt_available') {
      return { score: null, label: 'N/A', explanation: 'Only scored for prebuilt_available' };
    }
    if (!output.ruleId) {
      return { score: 0, label: 'no_rule_id', explanation: 'The check returned no rule_id' };
    }
    const read = await readRule(rules, output.ruleId);
    if ('error' in read) {
      return read.error;
    }
    const { rule } = read;
    const label = !rule
      ? 'unknown_id'
      : rule.source !== 'prebuilt'
      ? 'already_installed'
      : output.prebuiltVersion !== rule.version
      ? 'wrong_version'
      : 'installable';
    return {
      score: label === 'installable' ? 1 : 0,
      label,
      explanation: `prebuilt_version=${output.prebuiltVersion ?? 'missing'}, catalog version=${
        rule?.source === 'prebuilt' ? rule.version : 'none'
      }`,
    };
  },
});

/**
 * Questions for the judge model. The judge sees the gap, the answer, and the rule the answer
 * names. It does not see the answer key.
 */
export const RATIONALE_CRITERIA: EvaluationCriterionStructured[] = [
  {
    id: 'names_shared_behavior',
    text:
      'rationale_summary names a concrete behavior from the gap (such as a process, command, ' +
      'file, or event) and says that the chosen rule detects it. With the verdict no_coverage, ' +
      'it says instead why no rule detects the gap.',
  },
  {
    id: 'rule_claims_match_rule',
    text:
      'Every claim that rationale_summary and rationale make about the chosen rule agrees with ' +
      'rule_evidence, the description and query of that rule. When rule_evidence says that the ' +
      'rule was not found, FAIL. Mark N/A only when rule_evidence is null, because the answer ' +
      'names no rule.',
  },
  {
    id: 'agrees_with_verdict',
    text:
      'Nothing in rationale_summary or rationale contradicts the verdict. For example, the text ' +
      'does not say that no rule detects the gap while the verdict names a rule, and it does not ' +
      'call a disabled rule enabled.',
  },
];

const RULE_NOT_FOUND = {
  found: false,
  note: 'No installed or prebuilt rule has this rule_id.',
};

/**
 * Asks the judge model the rationale questions about one answer. The judge sees the gap, the
 * answer, and the rule the answer names. The answer key and the example notes would tell the
 * judge the right verdict, so it does not get them.
 */
export const judgeRationale = async ({
  judge,
  rules,
  indicator,
  output,
}: {
  judge: Evaluator;
  rules: RuleLookup;
  indicator: CoverageIndicator;
  output: CoverageCheckResult;
}): Promise<EvaluationResult> => {
  if (output.checkFailed || !output.rationaleSummary) {
    return { score: null, label: 'N/A', explanation: 'The check returned no rationale' };
  }
  let ruleEvidence: RuleEvidence | typeof RULE_NOT_FOUND | null = null;
  if (output.ruleId) {
    const read = await readRule(rules, output.ruleId);
    if ('error' in read) {
      return read.error;
    }
    ruleEvidence = read.rule ?? RULE_NOT_FOUND;
  }
  try {
    return await judge.evaluate({
      input: { gap: indicator },
      output: {
        verdict: output.verdict,
        rule_id: output.ruleId ?? null,
        rule_name: output.ruleName ?? null,
        rationale_summary: output.rationaleSummary,
        rationale: output.rationale ?? null,
        rule_evidence: ruleEvidence,
      },
      expected: undefined,
      metadata: null,
    });
  } catch (err) {
    // For example, the judge left a question unanswered after its retries.
    return { score: null, label: 'judge_error', explanation: errorMessage(err) };
  }
};

/**
 * Judge model score for the rationale that the analyst reads. Kept apart from the code scores,
 * because a judge model makes more mistakes than code.
 */
export const createRationaleEvaluator = ({
  evaluators,
  rules,
}: {
  evaluators: DefaultEvaluators;
  rules: RuleLookup;
}): CoverageEvaluator => {
  const judge = evaluators.criteria(RATIONALE_CRITERIA);
  return {
    name: 'Rationale',
    kind: 'LLM',
    direction: 'maximize',
    getModel: judge.getModel,
    evaluate: async ({ input, output }) =>
      judgeRationale({ judge, rules, indicator: input.indicator, output }),
  };
};

/** All evaluators of one experiment. They share one rule lookup. */
export const createCoverageEvaluators = ({
  evaluators,
  fetch,
}: {
  evaluators: DefaultEvaluators;
  fetch: HttpHandler;
}): CoverageEvaluator[] => {
  const rules = new RuleLookup(fetch);
  return [
    createVerdictEvaluator(),
    createRuleMatchEvaluator(rules),
    createInstallableEvaluator(rules),
    createRationaleEvaluator({ evaluators, rules }),
  ];
};
