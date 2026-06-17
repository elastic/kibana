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
import { createEsqlEquivalenceEvaluator } from '@kbn/evals';
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ToolingLog } from '@kbn/tooling-log';
import type { ReferenceRule } from '../datasets/sample_rules';
import type { RejectionCode, SecurityRuleGenerationClient } from './chat_client';
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
  /**
   * Structured rejection code from the AI rule-creation graph's rejection path
   * (https://github.com/elastic/kibana/pull/270236). Present only when the tool deliberately
   * declined to produce a rule. `NO_DATA` is an environment constraint (skipped as N/A);
   * `INVALID_OUTPUT` is a model-quality failure (scored, not skipped).
   */
  rejectionCode?: RejectionCode;
}

/**
 * Deliberate rejections that represent the model correctly declining to generate a rule.
 * `INVALID_OUTPUT` is intentionally excluded: it means the model produced a malformed rule that
 * failed schema validation, which is a quality failure rather than a deliberate refusal.
 */
const DELIBERATE_REJECTION_CODES: readonly RejectionCode[] = [
  'NO_DATA',
  'INCOHERENT',
  'NOT_SECURITY_RELEVANT',
];

// ---------------------------------------------------------------------------
// Skip stats registry — accumulated per dataset, consumed by the reporter
// ---------------------------------------------------------------------------

export interface DatasetSkipSummary {
  datasetName: string;
  totalExamples: number;
  succeeded: number;
  missingIndexSkips: number;
  otherFailures: number;
  otherFailureReasons: string[];
}

const datasetSkipSummaries = new Map<string, DatasetSkipSummary>();

export function getDatasetSkipSummaries(): DatasetSkipSummary[] {
  return Array.from(datasetSkipSummaries.values());
}

export function clearDatasetSkipSummaries(): void {
  datasetSkipSummaries.clear();
}

const MAX_REASON_LENGTH = 120;
function truncate(s: string): string {
  return s.length > MAX_REASON_LENGTH ? `${s.slice(0, MAX_REASON_LENGTH)}...` : s;
}

type RuleExample = Example<{ prompt: string }, ReferenceRule, Record<string, unknown> | null>;

const NEGATIVE_CASE_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation: 'Not applicable: negative case — model should reject this request',
};

const NON_ESQL_REFERENCE_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation: 'Not applicable: reference rule is not ES|QL',
};

const MISSING_INDEX_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation:
    'Not applicable: rule generation failed due to missing index — not a model quality issue',
};

const AGENT_ERROR_NA = {
  score: null as null,
  label: 'N/A' as const,
  explanation:
    'Not applicable: rule generation failed due to an agent/environment error — not a model quality issue',
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

/**
 * Wraps an evaluator so it returns N/A when the reference rule is not ES|QL.
 * The ES|QL Functional Equivalence evaluator prompt expects ES|QL on both sides;
 * comparing a generated ES|QL query against an EQL/kuery/empty ground truth is meaningless.
 */
function skipNonEsqlReferences(
  evaluator: Evaluator<RuleExample, RuleGenerationTaskOutput>
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    ...evaluator,
    evaluate: async (args) => {
      if (args.expected?.language !== 'esql' && !args.expected?.esqlQuery) {
        return NON_ESQL_REFERENCE_NA;
      }
      return evaluator.evaluate(args);
    },
  };
}

/**
 * Wraps an evaluator so it returns N/A when rule generation failed because no relevant
 * data/index could be discovered. The rule-creation graph now surfaces this as a structured
 * `NO_DATA` rejection (https://github.com/elastic/kibana/pull/270236); the legacy free-text
 * "could not discover a suitable index" message is still matched for backward compatibility.
 * This is an environment constraint (no matching data), not a model quality issue, so it
 * should not penalise scores.
 */
function isMissingDataFailure(output: RuleGenerationTaskOutput | undefined): boolean {
  if (output?.rejectionCode === 'NO_DATA') return true;
  return Boolean(output?.error && /could not discover a suitable index/i.test(output.error));
}

function skipMissingIndexFailures(
  evaluator: Evaluator<RuleExample, RuleGenerationTaskOutput>
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    ...evaluator,
    evaluate: async (args) => {
      if (isMissingDataFailure(args.output as RuleGenerationTaskOutput)) {
        return MISSING_INDEX_NA;
      }
      return evaluator.evaluate(args);
    },
  };
}

/**
 * Wraps an evaluator so it returns N/A when the agent call itself errored for an
 * uncoded reason (e.g. "Last action is not a generate_query action") — a genuine
 * agent/environment failure that should not penalise model-quality scores.
 *
 * Structured rejections that carry a `rejectionCode` are deliberate model decisions and are
 * NOT skipped here: `NO_DATA` is handled by `skipMissingIndexFailures`, while `INVALID_OUTPUT`
 * (and any future deliberate rejection) is a quality signal that should be scored.
 */
function skipAgentErrors(
  evaluator: Evaluator<RuleExample, RuleGenerationTaskOutput>
): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    ...evaluator,
    evaluate: async (args) => {
      const output = args.output as RuleGenerationTaskOutput;
      const isUncodedError =
        Boolean(output?.error) &&
        !output?.rejectionCode &&
        !/could not discover a suitable index/i.test(output?.error ?? '');
      if (isUncodedError) {
        return AGENT_ERROR_NA;
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
          metadata: {
            error: 'No rule generated',
            missing: ['name', 'description', 'query', 'severity', 'tags', 'riskScore'],
          },
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
 * A pass now requires a *deliberate* structured rejection (`NO_DATA` / `INCOHERENT` /
 * `NOT_SECURITY_RELEVANT`) rather than merely the absence of a rule, so accidental failures
 * (e.g. `INVALID_OUTPUT` schema failures or uncoded agent errors) are not credited as refusals.
 * Returns N/A for positive cases since rule generation is expected there.
 */
function createRejectionEvaluator(): Evaluator<RuleExample, RuleGenerationTaskOutput> {
  return {
    name: 'Rejection',
    kind: 'CODE',
    evaluate: async ({ output, expected, metadata }) => {
      if (expected?.category !== 'negative') {
        return { score: null, label: 'N/A', explanation: 'Not applicable: not a negative case' };
      }
      const expectedRejectionCode = metadata?.expectedRejectionCode as RejectionCode | undefined;
      const { generatedRule, rejectionCode } = (output as RuleGenerationTaskOutput) ?? {};
      if (generatedRule) {
        return {
          score: 0,
          label: 'FAIL',
          explanation: 'Model incorrectly generated a rule for an impossible request',
          metadata: { expectedRejectionCode, rejectionCode: null },
        };
      }
      const deliberate =
        rejectionCode != null && DELIBERATE_REJECTION_CODES.includes(rejectionCode);
      return {
        score: deliberate ? 1 : 0,
        label: deliberate ? 'PASS' : 'FAIL',
        explanation: deliberate
          ? `Model correctly refused with rejection code ${rejectionCode}${
              expectedRejectionCode
                ? ` (expected ${expectedRejectionCode}${
                    rejectionCode === expectedRejectionCode ? ', match' : ''
                  })`
                : ''
            }`
          : rejectionCode
          ? `Model failed with code ${rejectionCode} rather than deliberately refusing`
          : 'Model produced no rule but did not emit a deliberate rejection',
        metadata: { expectedRejectionCode, rejectionCode: rejectionCode ?? null },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// LLM evaluators
// ---------------------------------------------------------------------------

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
  inferenceClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  executorClient: EvalsExecutorClient;
  chatClient: SecurityRuleGenerationClient;
  inferenceClient: BoundInferenceClient;
  log: ToolingLog;
}): ({ dataset }: { dataset: EvaluationDataset<RuleExample> }) => Promise<void> {
  const esqlEquivalenceEvaluator = createEsqlEquivalenceEvaluator({
    inferenceClient,
    log,
    predictionExtractor: (output: unknown) =>
      (output as RuleGenerationTaskOutput)?.generatedRule?.query ?? '',
    groundTruthExtractor: (expected: unknown) => {
      const rule = expected as Partial<ReferenceRule>;
      return rule?.esqlQuery ?? rule?.query ?? '';
    },
  });

  // skipNegativeCases is applied outermost so negative examples consistently report
  // NEGATIVE_CASE_NA, while skipMissingIndexFailures / skipAgentErrors handle environment
  // and agent failures for positive examples.
  const skip = (e: Evaluator<RuleExample, RuleGenerationTaskOutput>) =>
    skipNegativeCases(skipAgentErrors(skipMissingIndexFailures(e)));

  const allEvaluators: Array<Evaluator<RuleExample, RuleGenerationTaskOutput>> = [
    // CODE — deterministic
    skip(createQuerySyntaxValidityEvaluator()),
    skip(createFieldCoverageEvaluator()),
    skip(createRuleTypeLanguageEvaluator()),
    skip(createMitreAccuracyEvaluator()),
    skip(createSeverityValidityEvaluator()),
    skip(createRiskScoreValidityEvaluator()),
    skip(createIntervalFormatEvaluator()),
    skip(createLookbackGapEvaluator()),
    skip(createSeverityMatchEvaluator()),
    skip(createRiskScoreMatchEvaluator()),
    // LLM — ES|QL functional equivalence via @kbn/evals built-in evaluator
    skip(skipNonEsqlReferences(esqlEquivalenceEvaluator)),
    // Intentionally disabled for speed: these LLM evaluators add significant latency per example.
    // Re-enable when running thorough multi-model comparisons.
    // skip(createRuleNameEvaluator(evaluators)),
    // skip(createRuleDescriptionEvaluator(evaluators)),
    // Rejection — scores 1 when the model deliberately refuses a negative case, N/A for positive
    // cases. Wrapped only with skipAgentErrors (NOT skipMissingIndexFailures), because a NO_DATA
    // rejection IS the correct outcome on a negative case and must be scored, not skipped.
    skipAgentErrors(createRejectionEvaluator()),
  ];

  return async function evaluateDataset({
    dataset,
  }: {
    dataset: EvaluationDataset<RuleExample>;
  }): Promise<void> {
    let totalExamples = 0;
    let succeeded = 0;
    let missingIndexFailures = 0;
    let otherFailures = 0;
    const otherFailureReasons: string[] = [];

    await executorClient.runExperiment(
      {
        datasets: [dataset],
        task: async ({ input, output: expected }) => {
          if (!input) throw new Error('Missing input for task');
          totalExamples++;
          const SEP = '═'.repeat(60);
          log.info(`[Task] Prompt: "${input.prompt}"`);
          try {
            const taskResult = await chatClient.generateRule(input.prompt);

            if (!taskResult.generatedRule) {
              const rejectionOutput = taskResult.rejectionCode
                ? { rejectionCode: taskResult.rejectionCode }
                : {};

              if (expected?.category === 'negative') {
                // Negative-case prompts are expected to be rejected. Treat a refusal as success
                // so dataset summaries don't misclassify correct behavior as an "agent error".
                succeeded++;
                log.info(
                  `[Task] Negative case: model refused to generate a rule (expected). Rejection code: ${
                    taskResult.rejectionCode ?? 'none'
                  }`
                );
                return { ...rejectionOutput, error: taskResult.error };
              }

              const isMissingIndex =
                taskResult.rejectionCode === 'NO_DATA' ||
                (taskResult.error && /could not discover a suitable index/i.test(taskResult.error));
              if (isMissingIndex) {
                missingIndexFailures++;
                log.warning(
                  `[Task] Skipped — no data/index (all evaluators will return N/A). Error: ${taskResult.error}`
                );
              } else {
                otherFailures++;
                otherFailureReasons.push(
                  truncate(
                    taskResult.rejectionCode
                      ? `${taskResult.rejectionCode}: ${taskResult.error ?? 'rejected'}`
                      : taskResult.error ?? 'No rule returned'
                  )
                );
                log.warning(
                  `[Task] No rule generated.${
                    taskResult.rejectionCode ? ` Rejection: ${taskResult.rejectionCode}.` : ''
                  } Error: ${taskResult.error}`
                );
              }
              return {
                ...rejectionOutput,
                error: taskResult.error || 'No rule returned from agent',
              };
            }

            if (expected?.category === 'negative') {
              // Negative-case prompts should not produce rules.
              otherFailures++;
              otherFailureReasons.push(truncate('Generated a rule for a negative-case prompt'));
              log.warning(
                '[Task] Negative case: model generated a rule (unexpected; rejection evaluator will fail)'
              );
            } else {
              succeeded++;
            }
            log.info(SEP);
            log.success(`Generated rule: "${taskResult.generatedRule.name}"`);
            log.info(JSON.stringify(taskResult.generatedRule, null, 2));
            log.info(SEP);

            const genTech = extractMitreTechniques(taskResult.generatedRule);
            const expTech = extractMitreTechniques(expected ?? {});
            log.info(
              `[Result] MITRE: generated=[${[...genTech].join(', ') || 'none'}] | expected=[${
                [...expTech].join(', ') || 'none'
              }]`
            );

            const { coverage, missing } = hasRequiredFields(taskResult.generatedRule);
            log.info(
              `[Result] Field coverage: ${Math.round(coverage * 100)}%${
                missing.length ? ` | missing: ${missing.join(', ')}` : ''
              }`
            );

            log.info(
              `[Result] Rule type & language: type=${taskResult.generatedRule.type} | language=${taskResult.generatedRule.language}`
            );

            const syntaxResult = validateEsqlSyntax(taskResult.generatedRule.query ?? '');
            log.info(
              `[Result] Query syntax: ${
                syntaxResult.valid ? 'valid' : `INVALID — ${syntaxResult.error}`
              }`
            );

            return taskResult;
          } catch (error) {
            otherFailures++;
            const msg = error instanceof Error ? error.message : String(error);
            otherFailureReasons.push(truncate(msg));
            log.error(`Error generating rule: ${msg}`);
            return { error: msg || 'Unknown error' };
          }
        },
      },
      allEvaluators
    );

    datasetSkipSummaries.set(dataset.name, {
      datasetName: dataset.name,
      totalExamples,
      succeeded,
      missingIndexSkips: missingIndexFailures,
      otherFailures,
      otherFailureReasons,
    });

    if (missingIndexFailures > 0 || otherFailures > 0) {
      const parts = [
        `${succeeded} succeeded`,
        missingIndexFailures > 0 ? `${missingIndexFailures} skipped (missing index)` : undefined,
        otherFailures > 0 ? `${otherFailures} failed (agent error)` : undefined,
      ].filter(Boolean);
      log.warning(`[Summary] ${dataset.name}: ${totalExamples} total — ${parts.join(', ')}`);
    } else {
      log.info(`[Summary] ${dataset.name}: ${totalExamples} total — ${succeeded} succeeded`);
    }
  };
}
