/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InferenceClient } from '@kbn/inference-common';
import type { Evaluator } from '@kbn/evals';
import type { ReferenceRule } from '../datasets/sample_rules';
import {
  normalizeQuery,
  validateEsqlSyntax,
  extractMitreTechniques,
  calculateSetMetrics,
  hasRequiredFields,
} from './helpers';

export interface RuleGenerationTaskOutput {
  generatedRule?: Partial<ReferenceRule>;
  error?: string;
}

/**
 * Create all evaluators for rule generation
 */
export function createRuleEvaluators({
  inferenceClient,
}: {
  inferenceClient: InferenceClient;
}): Array<Evaluator<{ prompt: string }, ReferenceRule, RuleGenerationTaskOutput>> {
  return [
    createQuerySyntaxValidityEvaluator(),
    createFieldCoverageEvaluator(),
    createMitreAccuracyEvaluator(),
    createQuerySimilarityEvaluator({ inferenceClient }),
    createSemanticCorrectnessEvaluator({ inferenceClient }),
  ];
}

/**
 * Evaluator 4: Query Syntax Validity
 * Validates that generated query is syntactically valid ESQL
 */
function createQuerySyntaxValidityEvaluator(): Evaluator<
  { prompt: string },
  ReferenceRule,
  RuleGenerationTaskOutput
> {
  return {
    name: 'Query Syntax Validity',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      if (!output?.generatedRule?.query) {
        return {
          score: 0,
          metadata: {
            error: 'No query generated',
          },
        };
      }

      const validation = validateEsqlSyntax(output.generatedRule.query);

      return {
        score: validation.valid ? 1 : 0,
        metadata: {
          valid: validation.valid,
          error: validation.error,
          query: output.generatedRule.query.substring(0, 200), // Truncate for logging
        },
      };
    },
  };
}

/**
 * Evaluator 2: Field Coverage
 * Checks if generated rule includes key required fields
 */
function createFieldCoverageEvaluator(): Evaluator<
  { prompt: string },
  ReferenceRule,
  RuleGenerationTaskOutput
> {
  return {
    name: 'Field Coverage',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      if (!output?.generatedRule) {
        return {
          score: 0,
          metadata: {
            error: 'No rule generated',
            missing: ['name', 'description', 'query', 'severity', 'tags'],
          },
        };
      }

      const { coverage, missing } = hasRequiredFields(output.generatedRule);

      return {
        score: coverage,
        metadata: {
          coverage: `${Math.round(coverage * 100)}%`,
          missing,
        },
      };
    },
  };
}

/**
 * Evaluator 3: MITRE Mapping Accuracy
 * Compares MITRE ATT&CK techniques between generated and reference
 */
function createMitreAccuracyEvaluator(): Evaluator<
  { prompt: string },
  ReferenceRule,
  RuleGenerationTaskOutput
> {
  return {
    name: 'MITRE Accuracy',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      if (!output?.generatedRule) {
        return {
          score: 0,
          metadata: {
            error: 'No rule generated',
          },
        };
      }

      const generatedTechniques = extractMitreTechniques(output.generatedRule);
      const expectedTechniques = extractMitreTechniques(expected);

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

/**
 * Evaluator 1: Query Similarity (LLM-as-judge)
 * Compares generated query to reference query for semantic equivalence
 */
function createQuerySimilarityEvaluator({
  inferenceClient,
}: {
  inferenceClient: InferenceClient;
}): Evaluator<{ prompt: string }, ReferenceRule, RuleGenerationTaskOutput> {
  return {
    name: 'Query Similarity',
    kind: 'LLM',
    evaluate: async ({ output, expected }) => {
      if (!output?.generatedRule?.query) {
        return {
          score: 0,
          metadata: {
            error: 'No query generated',
          },
        };
      }

      const generatedQuery = normalizeQuery(output.generatedRule.query);
      const expectedQuery = normalizeQuery(expected.query);

      const prompt = `You are evaluating the semantic similarity between two ESQL detection queries.

Reference Query (expected):
${expectedQuery}

Generated Query:
${generatedQuery}

Task: Compare the generated ESQL query with the expected dataset query and evaluate if they are functionally equivalent.

Consider:
1. Do they detect the same threat patterns?
2. Are the key conditions and filters equivalent?
3. Would they produce similar results on the same data?
4. Minor differences in syntax, formatting, or field names are acceptable if the logic is equivalent.

Respond with a score from 0 to 100:
- 100 = Functionally equivalent, detects the same threats
- 70-90 = Very similar, minor differences in coverage
- 40-60 = Partially similar, some overlapping detection logic
- 10-30 = Somewhat related but significantly different
- 0 = Completely different or invalid

Respond ONLY with a number between 0 and 100.`;

      try {
        const response = await inferenceClient.output({
          id: 'query-similarity',
          input: prompt,
        });

        // Extract percentage score (0-100)
        const scoreMatch = response.content?.match(/\b(\d{1,3}(?:\.\d+)?)\b/);
        const percentageScore = scoreMatch ? parseFloat(scoreMatch[0]) : 0;
        
        // Clamp to [0, 100] and convert to [0, 1] for @kbn/evals
        const clampedPercentage = Math.max(0, Math.min(100, percentageScore));
        const normalizedScore = clampedPercentage / 100;

        return {
          score: normalizedScore,
          metadata: {
            percentageScore: `${clampedPercentage}%`,
            llmResponse: response.content?.substring(0, 200),
            generatedQueryPreview: generatedQuery.substring(0, 100),
            expectedQueryPreview: expectedQuery.substring(0, 100),
          },
        };
      } catch (error) {
        return {
          score: 0,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };
}

/**
 * Evaluator 5: Semantic Correctness (LLM-as-judge)
 * Evaluates if the rule would detect the threat described in the prompt
 */
function createSemanticCorrectnessEvaluator({
  inferenceClient,
}: {
  inferenceClient: InferenceClient;
}): Evaluator<{ prompt: string }, ReferenceRule, RuleGenerationTaskOutput> {
  return {
    name: 'Semantic Correctness',
    kind: 'LLM',
    evaluate: async ({ input, output, expected }) => {
      if (!output?.generatedRule) {
        return {
          score: 0,
          metadata: {
            error: 'No rule generated',
          },
        };
      }

      const prompt = `You are evaluating whether a generated detection rule correctly addresses the given threat detection requirement.

User Request:
${input.prompt}

Expected Threat Description:
${expected.description}

Generated Rule:
Name: ${output.generatedRule.name || 'N/A'}
Description: ${output.generatedRule.description || 'N/A'}
Query: ${output.generatedRule.query || 'N/A'}

Task: Evaluate if the generated rule would effectively detect the threat described in the user request and expected description.

Consider:
1. Does the rule logic align with the threat description?
2. Would it detect the described attack pattern or behavior?
3. Are the key indicators and conditions appropriate?
4. Is the scope and coverage reasonable for the threat?

Respond with a score from 0 to 100:
- 100 = Perfect match, would effectively detect the described threat
- 70-90 = Good match, minor gaps in coverage
- 40-60 = Partial match, some relevant detection logic but gaps
- 10-30 = Poor match, misses key aspects of the threat
- 0 = Completely incorrect or would not detect the threat

Respond ONLY with a number between 0 and 100.`;

      try {
        const response = await inferenceClient.output({
          id: 'semantic-correctness',
          input: prompt,
        });

        // Extract percentage score (0-100)
        const scoreMatch = response.content?.match(/\b(\d{1,3}(?:\.\d+)?)\b/);
        const percentageScore = scoreMatch ? parseFloat(scoreMatch[0]) : 0;
        
        // Clamp to [0, 100] and convert to [0, 1] for @kbn/evals
        const clampedPercentage = Math.max(0, Math.min(100, percentageScore));
        const normalizedScore = clampedPercentage / 100;

        return {
          score: normalizedScore,
          metadata: {
            percentageScore: `${clampedPercentage}%`,
            llmResponse: response.content?.substring(0, 200),
            generatedName: output.generatedRule.name,
            expectedName: expected.name,
          },
        };
      } catch (error) {
        return {
          score: 0,
          metadata: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  };
}
