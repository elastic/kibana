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
  extractMitreTechniques,
  calculateSetMetrics,
  hasRequiredFields,
} from './helpers';

export interface RuleGenerationTaskOutput {
  generatedRule?: Partial<ReferenceRule>;
  error?: string;
}

type RuleExample = Example<{ prompt: string }, ReferenceRule, Record<string, unknown> | null>;


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
      const validation = validateEsqlSyntax(output.generatedRule.query);
      return {
        score: validation.valid ? 1 : 0,
        metadata: { valid: validation.valid, error: validation.error },
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
      return {
        score: metrics.f1,
        metadata: {
          precision: metrics.precision,
          recall: metrics.recall,
          f1: metrics.f1,
          generated: Array.from(generatedTechniques),
          expected: Array.from(expectedTechniques),
        },
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
      const generatedQuery = output?.generatedRule?.query ?? '(no query generated)';
      const expectedQuery = expected?.query ?? '(no expected query)';

      const criteriaEval = evaluators.criteria([
        `The generated ES|QL query should be functionally equivalent to the expected query — ` +
          `detecting the same threat patterns and producing the same results on the same data, ` +
          `even if they use different query languages (EQL vs ES|QL), different syntax, ` +
          `different field ordering, or different column names. ` +
          `Expected query: ${expectedQuery} ` +
          `Generated query: ${generatedQuery}`,
      ]);

      return criteriaEval.evaluate({ input, output: output?.generatedRule, expected, metadata });
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
    createQuerySyntaxValidityEvaluator(),
    createFieldCoverageEvaluator(),
    createRuleTypeLanguageEvaluator(),
    createMitreAccuracyEvaluator(),
    // LLM — functional/semantic equivalence via built-in @kbn/evals criteria evaluator
    createEsqlFunctionalEquivalenceEvaluator(evaluators),
    // Intentionally disabled for speed: these LLM evaluators add significant latency per example.
    // Re-enable when running thorough multi-model comparisons.
    // createRuleNameEvaluator(evaluators),
    // createRuleDescriptionEvaluator(evaluators),
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
