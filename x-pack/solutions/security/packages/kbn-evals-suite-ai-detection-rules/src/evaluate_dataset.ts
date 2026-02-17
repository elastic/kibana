/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, EvalsExecutorClient, Example, DefaultEvaluators } from '@kbn/evals';
import { selectEvaluators } from '@kbn/evals';
import type { RuleCreationClient, GeneratedRule } from './rule_creation_client';

interface ExpectedRule {
  name: string;
  description: string;
  query: string;
  severity?: string;
  risk_score?: number;
  tags?: string[];
  threat?: Array<{
    framework: string;
    tactic: { id: string; name: string };
  }>;
}

type AiRulesExample = Example<
  { prompt: string },
  { expectedRule: ExpectedRule },
  { source?: string; ruleId?: string } | null
>;

export type EvaluateAiRulesDataset = (params: {
  dataset: {
    name: string;
    description: string;
    examples: AiRulesExample[];
  };
}) => Promise<void>;

export function createEvaluateAiRulesDataset({
  executorClient,
  ruleCreationClient,
  evaluators,
}: {
  executorClient: EvalsExecutorClient;
  ruleCreationClient: RuleCreationClient;
  evaluators: DefaultEvaluators;
}): EvaluateAiRulesDataset {
  return async ({ dataset: { name, description, examples } }) => {
    const dataset = { name, description, examples };

    await executorClient.runExperiment(
      {
        dataset,
        concurrency: 1,
        task: async ({ input }: AiRulesExample) => {
          return ruleCreationClient.createRule({ prompt: input.prompt });
        },
      },
      selectEvaluators<AiRulesExample, { rule: GeneratedRule }>([
        // CODE Evaluator 1: Rule Field Match
        {
          name: 'RuleFieldMatch',
          kind: 'CODE',
          evaluate: async ({ output, expected }) => {
            const rule = output?.rule;
            const expectedRule = expected?.expectedRule;
            if (!rule || !expectedRule) {
              return { score: 0, metadata: { error: 'Missing rule data' } };
            }

            let matched = 0;
            let total = 0;

            // Check type and language
            if (rule.type === 'esql') matched++; total++;
            if (rule.language === 'esql') matched++; total++;

            // Check severity match
            if (rule.severity === expectedRule.severity) matched++; total++;

            // Check tags overlap (Jaccard similarity)
            if (rule.tags && expectedRule.tags) {
              const ruleTags = new Set(rule.tags);
              const expectedTags = new Set(expectedRule.tags);
              const intersection = [...ruleTags].filter(t => expectedTags.has(t)).length;
              const union = new Set([...ruleTags, ...expectedTags]).size;
              matched += intersection / union;
              total++;
            }

            return { score: matched / total, metadata: { matched, total } };
          },
        },

        // CODE Evaluator 2: Query Similarity
        {
          name: 'QuerySimilarity',
          kind: 'CODE',
          evaluate: async ({ output, expected }) => {
            const rule = output?.rule;
            const expectedRule = expected?.expectedRule;
            if (!rule?.query || !expectedRule?.query) {
              return { score: 0, metadata: { error: 'Missing query' } };
            }

            // Normalize queries
            const normalize = (q: string) => 
              q.replace(/\/\/[^\n]*/g, '')
               .replace(/\s+/g, ' ')
               .trim()
               .toLowerCase();

            const normalizedGenerated = normalize(rule.query);
            const normalizedExpected = normalize(expectedRule.query);

            // Simple containment check
            const containsExpected = normalizedGenerated.includes(normalizedExpected);
            const score = containsExpected ? 1 : 0;

            return {
              score,
              metadata: {
                expectedLength: normalizedExpected.length,
                generatedLength: normalizedGenerated.length,
              },
            };
          },
        },

        // LLM Evaluator 3: LLM Judge (0-100% score via criteria API)
        {
          name: 'LLMRuleQuality',
          kind: 'LLM',
          evaluate: async ({ input, output, expected, metadata }) => {
            const rule = output?.rule;
            const expectedRule = expected?.expectedRule;
            
            if (!rule || !expectedRule) {
              return { score: 0, metadata: { error: 'Missing rule data' } };
            }

            // Use evaluators.criteria() with clean, concise criteria
            const criteria = [
              'The generated rule has type=esql and language=esql',
              'The generated query logically matches the expected detection pattern',
              'The generated name and description convey the same detection intent as expected',
              'Severity and risk score are appropriate for the threat level',
              'MITRE ATT&CK tactics and techniques are correctly mapped',
            ];

            const result = await evaluators.criteria(criteria).evaluate({
              input,
              output,
              expected,
              metadata,
            });

            const normalizedScore = typeof result?.score === 'number' ? result.score : 0;

            return {
              ...result,
              score: normalizedScore,
              metadata: {
                ...(result?.metadata ?? {}),
                percentage: Math.round(normalizedScore * 100), // 0-100% score
              },
            };
          },
        },
      ])
    );
  };
}
