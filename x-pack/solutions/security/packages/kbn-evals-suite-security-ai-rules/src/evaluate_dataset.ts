/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  Evaluator,
  EvaluationDataset,
  Example,
  EvalsExecutorClient,
} from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ReferenceRule } from '../datasets/sample_rules';
import type { SecurityRuleGenerationClient } from './chat_client';
import {
  validateEsqlSyntax,
  validateFromClause,
  validateSeverity,
  validateRiskScore,
  validateInterval,
  parseDateMathSeconds,
  extractMitreTechniques,
  calculateSetMetrics,
  hasRequiredFields,
} from './helpers';

export interface RuleGenerationTaskOutput {
  generatedRule?: Partial<ReferenceRule>;
  error?: string;
}

type RuleExample = Example<{ prompt: string }, ReferenceRule, Record<string, unknown> | null>;

const NEGATIVE_CASE_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation: 'Not applicable: negative case — model should reject this request',
};

/**
 * Wraps an evaluator so it returns N/A for negative-case examples (category === 'negative').
 * These are prompts where the model should refuse to generate a rule, so production-quality
 * metrics (field coverage, syntax validity, etc.) are meaningless and should not skew averages.
 */
function skipNegativeCases(
  evaluator: Evaluator<RuleExample, RuleGenerationTaskOutput>
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    ...evaluator,
    evaluate: async (args) => {
      if (args.expected?.category === 'negative') {
        return NEGATIVE_CASE_NA;
      }
      return evaluator.evaluate(args);
    },
  };
}


// ---------------------------------------------------------------------------
// CODE evaluators — deterministic, no LLM required
// ---------------------------------------------------------------------------

function createQuerySyntaxValidityEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Query Syntax Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      if (!output?.generatedRule?.query) {
        return { score: 0, metadata: { error: 'No query generated' } };
      }
      const { query } = output.generatedRule;
      const syntaxValidation = validateEsqlSyntax(query);
      if (!syntaxValidation.valid) {
        return { score: 0, metadata: { valid: false, error: syntaxValidation.error } };
      }
      const fromValidation = validateFromClause(query);
      return {
        score: fromValidation.valid ? 1 : 0,
        metadata: { valid: fromValidation.valid, error: fromValidation.error },
      };
    },
  };
}

function createFieldCoverageEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Field Coverage',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      if (!output?.generatedRule) {
        return {
          score: 0,
          metadata: { error: 'No rule generated', missing: ['name', 'description', 'query', 'severity', 'tags'] },
        };
      }
      const { coverage, missing } = hasRequiredFields(output.generatedRule);
      return {
        score: coverage,
        metadata: { coverage: `${Math.round(coverage * 100)}%`, missing },
      };
    },
  };
}

function createRuleTypeLanguageEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Rule Type & Language',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { type, language } = output?.generatedRule ?? {};
      const typeOk = type === 'esql';
      const langOk = language === 'esql';
      return {
        score: typeOk && langOk ? 1 : 0,
        metadata: { type, language, typeOk, langOk },
      };
    },
  };
}

function createMitreAccuracyEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'MITRE Accuracy',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      if (!output?.generatedRule) {
        return { score: 0, metadata: { error: 'No rule generated' } };
      }
      const generatedTechniques = extractMitreTechniques(output.generatedRule);
      const expectedTechniques = extractMitreTechniques(expected ?? {});
      const metrics = calculateSetMetrics(generatedTechniques, expectedTechniques);
      const invalidFormat = [...generatedTechniques].filter(
        (t) => !/^T\d{4}(\.\d{3})?$/.test(t)
      );
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
  };
}

function createSeverityValidityEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Severity Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const severity = output?.generatedRule?.severity;
      const valid = validateSeverity(severity);
      return { score: valid ? 1 : 0, metadata: { severity, valid } };
    },
  };
}

function createRiskScoreValidityEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Risk Score Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const riskScore = output?.generatedRule?.riskScore;
      const valid = validateRiskScore(riskScore);
      return { score: valid ? 1 : 0, metadata: { riskScore, valid } };
    },
  };
}

function createIntervalFormatEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Interval Format',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const interval = output?.generatedRule?.interval;
      if (!interval) return { score: 0, metadata: { error: 'No interval set' } };
      const valid = validateInterval(interval);
      return { score: valid ? 1 : 0, metadata: { interval, valid } };
    },
  };
}

function createLookbackGapEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Lookback Gap',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      const { from, interval } = output?.generatedRule ?? {};
      const fromSec = parseDateMathSeconds(from);
      const intervalSec = interval ? parseDateMathSeconds(`now-${interval}`) : null;
      if (fromSec === null || intervalSec === null) {
        return { score: 0, metadata: { error: 'Cannot parse from/interval', from, interval } };
      }
      const hasGap = fromSec < intervalSec;
      return { score: hasGap ? 0 : 1, metadata: { from, interval, fromSec, intervalSec, hasGap } };
    },
  };
}

function createSeverityMatchEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Severity Match',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      const generated = output?.generatedRule?.severity;
      const expectedSeverity = expected?.severity;
      const match = generated === expectedSeverity;
      return { score: match ? 1 : 0, metadata: { generated, expected: expectedSeverity } };
    },
  };
}

function createRiskScoreMatchEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Risk Score Match',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      const generated = output?.generatedRule?.riskScore;
      const expectedScore = expected?.riskScore;
      if (generated == null || expectedScore == null) {
        return {
          score: 0,
          metadata: { error: 'Missing riskScore', generated, expected: expectedScore },
        };
      }
      const diff = Math.abs(generated - expectedScore);
      // Partial credit: 1.0 for exact match, 0.5 for ≤10 off, 0 otherwise
      const score = diff === 0 ? 1 : diff <= 10 ? 0.5 : 0;
      return { score, metadata: { generated, expected: expectedScore, diff } };
    },
  };
}

// ---------------------------------------------------------------------------
// Rejection evaluator — negative cases only
// ---------------------------------------------------------------------------

/**
 * Scores whether the model correctly refused to generate a rule for a negative case.
 * Returns N/A for positive cases since rule generation is expected there.
 */
function createRejectionEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Rejection',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      if (expected?.category !== 'negative') {
        return { score: null, label: 'N/A', explanation: 'Not applicable: not a negative case' };
      }
      const refused = !output?.generatedRule;
      return {
        score: refused ? 1 : 0,
        label: refused ? 'PASS' : 'FAIL',
        explanation: refused
          ? 'Model correctly refused to generate a rule'
          : 'Model incorrectly generated a rule for an impossible request',
      };
    },
  };
}

// ---------------------------------------------------------------------------
// LLM evaluators — use built-in @kbn/evals criteria evaluator
// ---------------------------------------------------------------------------

/**
 * Checks that the generated ES|QL query is functionally equivalent to the expected query —
 * i.e. it would produce the same detection results on the same data, regardless of language
 * differences (reference rules may be in EQL while generated rules are always ES|QL).
 */
function createEsqlFunctionalEquivalenceEvaluator(
  evaluators: DefaultEvaluators
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'ESQL Functional Equivalence',
    kind: 'LLM',
    evaluate: async ({ input, output, expected, metadata }) => {
      if (!expected?.query) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No reference query to compare against',
        };
      }

      if (!output?.generatedRule) {
        return {
          score: 0,
          label: 'FAIL',
          explanation: 'No rule was generated',
        };
      }

      const generatedQuery = output.generatedRule.query ?? '(no query generated)';
      const expectedQuery = expected.query;

      const criteriaEval = evaluators.criteria([
        `The generated ES|QL query should be functionally equivalent to the expected query — ` +
          `detecting the same threat patterns and producing the same results on the same data, ` +
          `even if they use different query languages (EQL vs ES|QL), different syntax, ` +
          `different field ordering, or different column names. ` +
          `Expected query: ${expectedQuery} ` +
          `Generated query: ${generatedQuery}`,
      ]);

      return criteriaEval.evaluate({ input, output: output.generatedRule, expected, metadata });
    },
  };
}

/**
 * Checks that the generated rule name semantically matches the expected rule name —
 * they should convey the same threat detection intent even if worded differently.
 */
export function createRuleNameEvaluator(
  evaluators: DefaultEvaluators
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Rule Name',
    kind: 'LLM',
    evaluate: async ({ input, output, expected, metadata }) => {
      const generatedName = output?.generatedRule?.name ?? '(no name generated)';
      const expectedName = expected?.name ?? '(no expected name)';

      const criteriaEval = evaluators.criteria([
        `The generated rule name should semantically match the expected rule name — ` +
          `both should describe the same threat or attack technique, ` +
          `even if the wording, capitalisation, or phrasing differs. ` +
          `Expected name: "${expectedName}" ` +
          `Generated name: "${generatedName}"`,
      ]);

      return criteriaEval.evaluate({ input, output: output?.generatedRule, expected, metadata });
    },
  };
}

/**
 * Checks that the generated rule description functionally describes the same threat scenario
 * as the expected description, even if worded differently.
 */
export function createRuleDescriptionEvaluator(
  evaluators: DefaultEvaluators
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Rule Description',
    kind: 'LLM',
    evaluate: async ({ input, output, expected, metadata }) => {
      const generatedDesc = output?.generatedRule?.description ?? '(no description generated)';
      const expectedDesc = expected?.description ?? '(no expected description)';

      const criteriaEval = evaluators.criteria([
        `The generated rule description should functionally describe the same threat scenario ` +
          `as the expected description — covering the same adversary behaviour, ` +
          `attack technique, or detection goal, even if the exact wording differs. ` +
          `Expected description: "${expectedDesc}" ` +
          `Generated description: "${generatedDesc}"`,
      ]);

      return criteriaEval.evaluate({ input, output: output?.generatedRule, expected, metadata });
    },
  };
}

// ---------------------------------------------------------------------------
// Factory — mirrors the agent-builder createEvaluateDataset pattern
// ---------------------------------------------------------------------------

export function createEvaluateDataset({
  evaluators,
  executorClient,
  chatClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SecurityRuleGenerationClient;
  log: ToolingLog;
}): ({ dataset }: { dataset: EvaluationDataset<RuleExample> }) => Promise<void> {
  const allEvaluators: Array<Evaluator<RuleExample, RuleGenerationTaskOutput>> = [
    // CODE — deterministic
    skipNegativeCases(createQuerySyntaxValidityEvaluator()),      // syntax + FROM wildcard check (G)
    skipNegativeCases(createFieldCoverageEvaluator()),            // required fields incl. riskScore (B partial)
    skipNegativeCases(createRuleTypeLanguageEvaluator()),
    skipNegativeCases(createMitreAccuracyEvaluator()),            // F1 score + invalidFormat metadata (H-A)
    skipNegativeCases(createSeverityValidityEvaluator()),         // enum check (A)
    skipNegativeCases(createRiskScoreValidityEvaluator()),        // 0–100 range check (B)
    skipNegativeCases(createIntervalFormatEvaluator()),           // duration string format (C)
    skipNegativeCases(createLookbackGapEvaluator()),              // from >= interval coverage (D)
    skipNegativeCases(createSeverityMatchEvaluator()),            // vs expected severity (E)
    skipNegativeCases(createRiskScoreMatchEvaluator()),           // vs expected riskScore with tolerance (F)
    // LLM — functional/semantic equivalence via built-in @kbn/evals criteria evaluator
    skipNegativeCases(createEsqlFunctionalEquivalenceEvaluator(evaluators)),
    // Intentionally disabled for speed: these LLM evaluators add significant latency per example.
    // Re-enable when running thorough multi-model comparisons.
    // skipNegativeCases(createRuleNameEvaluator(evaluators)),
    // skipNegativeCases(createRuleDescriptionEvaluator(evaluators)),
    // Rejection — scores 1 when model correctly refuses a negative case, N/A otherwise
    createRejectionEvaluator(),
  ];

  return async function evaluateDataset({
    dataset,
  }: {
    dataset: EvaluationDataset<RuleExample>;
  }): Promise<void> {
    await executorClient.runExperiment(
      {
        dataset,
        task: async ({ input, output: expected }) => {
          const SEP = '═'.repeat(60);
          log.info(`[Task] Prompt: "${input.prompt}"`);
          try {
            const taskResult = await chatClient.generateRule(input.prompt);

            if (!taskResult.generatedRule) {
              return { error: taskResult.error || 'No rule returned from agent' };
            }

            log.info(SEP);
            log.success(`Generated rule: "${taskResult.generatedRule.name}"`);
            log.info(JSON.stringify(taskResult.generatedRule, null, 2));
            log.info(SEP);

            // Vibe checks — mirrors what the evaluators will score
            const genTech = extractMitreTechniques(taskResult.generatedRule);
            const expTech = extractMitreTechniques(expected ?? {});
            log.info(
              `[Result] MITRE: generated=[${[...genTech].join(', ') || 'none'}] | expected=[${[...expTech].join(', ') || 'none'}]`
            );

            const { coverage, missing } = hasRequiredFields(taskResult.generatedRule);
            log.info(
              `[Result] Field coverage: ${Math.round(coverage * 100)}%${missing.length ? ` | missing: ${missing.join(', ')}` : ''}`
            );

            log.info(
              `[Result] Rule type & language: type=${taskResult.generatedRule.type} | language=${taskResult.generatedRule.language}`
            );

            const syntaxResult = validateEsqlSyntax(taskResult.generatedRule.query ?? '');
            log.info(
              `[Result] Query syntax: ${syntaxResult.valid ? 'valid' : `INVALID — ${syntaxResult.error}`}`
            );

            return taskResult;
          } catch (error) {
            log.error(
              `Error generating rule: ${error instanceof Error ? error.message : String(error)}`
            );
            return { error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },
      },
      allEvaluators
    );
  };
}
