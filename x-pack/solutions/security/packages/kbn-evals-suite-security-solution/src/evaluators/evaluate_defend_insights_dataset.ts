/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DefaultEvaluators,
  EvaluationDataset,
  Evaluator,
  KibanaPhoenixClient,
} from '@kbn/evals';
import type {
  DefendInsight,
  DefendInsights,
  DefendInsightType,
} from '@kbn/elastic-assistant-common';
import type { Example } from '@arizeai/phoenix-client/dist/esm/types/datasets';
import type {
  DefendInsightsEvaluationClient,
  DefendInsightsExampleInputWithOverrides,
} from '../clients';

interface DefendInsightsOutput {
  insights?: DefendInsights | null;
}

interface ExpectedDefendInsightOutput {
  insights: DefendInsights;
}

/**
 * Validates that the output contains defend insights
 */
function hasValidDefendInsights(output: unknown): output is DefendInsightsOutput {
  if (!output || typeof output !== 'object') {
    return false;
  }

  const outputObj = output as DefendInsightsOutput;
  return Array.isArray(outputObj.insights) && outputObj.insights.length > 0;
}

/**
 * Validates that the expected output has valid structure
 */
function isValidExpectedOutput(expected: unknown): expected is ExpectedDefendInsightOutput {
  if (!expected || typeof expected !== 'object') return false;
  const output = expected as Record<string, unknown>;
  return (
    Array.isArray(output.insights) &&
    output.insights.every(
      (insight: unknown) =>
        typeof insight === 'object' &&
        insight !== null &&
        'group' in insight &&
        'events' in insight &&
        Array.isArray((insight as DefendInsight).events) &&
        'remediation' in insight
    )
  );
}

/**
 * Tokenizes text for cosine similarity comparison
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

/**
 * Calculates cosine similarity between two text strings
 */
function cosineSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.length === 0 || tokens2.length === 0) {
    return 0;
  }

  const allTokens = [...new Set([...tokens1, ...tokens2])];
  const vector1 = allTokens.map((token) => tokens1.filter((t) => t === token).length);
  const vector2 = allTokens.map((token) => tokens2.filter((t) => t === token).length);

  const dotProduct = vector1.reduce((sum, a, i) => sum + a * vector2[i], 0);
  const magnitude1 = Math.sqrt(vector1.reduce((sum, a) => sum + a * a, 0));
  const magnitude2 = Math.sqrt(vector2.reduce((sum, a) => sum + a * a, 0));

  return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

/**
 * Gets similarity score between an insight and its expected requirement
 */
function getSimilarityScore(insight: DefendInsight, requirement: DefendInsight): number {
  const message = (insight.remediation?.message as string) ?? '';
  const reqMessage = (requirement.remediation?.message as string) ?? '';

  if (!message || !reqMessage) {
    return 0;
  }

  return cosineSimilarity(message, reqMessage);
}

/**
 * Creates a Phoenix-compatible evaluator for defend insights structural validation.
 *
 * This evaluator validates:
 * - Output contains insights array
 * - Array has at least one insight
 * - Each insight has required fields (group, events, remediation)
 */
export function createDefendInsightsStructureEvaluator(): Evaluator {
  return {
    name: 'defend_insights_structure',
    kind: 'CODE',
    evaluate: async ({ output }) => {
      if (!hasValidDefendInsights(output)) {
        return {
          score: 0,
          label: 'FAIL',
          explanation: 'No defend insights generated',
        };
      }

      const outputObj = output as DefendInsightsOutput;
      const insights = outputObj.insights ?? [];

      // Validate each insight has required fields
      const invalidInsights = insights.filter(
        (i) => !i.group || !i.events || !i.remediation?.message
      );

      if (invalidInsights.length > 0) {
        return {
          score: 0.5,
          label: 'PARTIAL',
          explanation: `Generated ${insights.length} insight(s) but ${invalidInsights.length} missing required fields`,
          metadata: {
            totalInsights: insights.length,
            invalidCount: invalidInsights.length,
          },
        };
      }

      return {
        score: 1,
        label: 'PASS',
        explanation: `Generated ${insights.length} valid defend insight(s)`,
        metadata: {
          totalInsights: insights.length,
        },
      };
    },
  };
}

/**
 * Creates a Phoenix-compatible evaluator for policy response failure defend insights.
 *
 * This evaluator validates:
 * - Insight count matches expected count
 * - Insight groups match expected groups
 * - Links match expected links
 * - Events match (count, IDs, endpoint IDs, values)
 * - Calculates similarity score for remediation messages using cosine similarity
 */
export function createPolicyResponseFailureEvaluator(): Evaluator {
  return {
    name: 'defend_insights_policy_response_failure',
    kind: 'CODE',
    evaluate: async ({ output, expected }) => {
      if (!isValidExpectedOutput(expected)) {
        return {
          score: 0,
          label: 'FAIL',
          explanation: 'Expected output structure is invalid or missing insights array',
        };
      }

      const { insights: requirements } = expected;

      // Extract insights from output
      const outputObj = output as DefendInsightsOutput | undefined;
      const insightsMap: Record<string, DefendInsight> = (outputObj?.insights ?? []).reduce(
        (acc: Record<string, DefendInsight>, insight: DefendInsight) => {
          acc[insight.group] = insight;
          return acc;
        },
        {} as Record<string, DefendInsight>
      );

      if (Object.keys(insightsMap).length === 0) {
        return {
          score: 0,
          label: 'FAIL',
          explanation: 'No defend insights generated',
        };
      }

      const failedChecks: Array<{ label: string; details?: string[] }> = [];

      // Check if insight count matches requirement count
      if (Object.keys(insightsMap).length !== requirements.length) {
        failedChecks.push({
          label: 'Number of insight groups does not match number of requirements',
          details: [
            `insights: ${Object.keys(insightsMap).length}`,
            `requirements: ${requirements.length}`,
          ],
        });
      }

      const allSimilarityScores: number[] = [];
      for (const req of requirements) {
        const label = `requirement "${req.group}"`;
        const matchedInsight = insightsMap[req.group];

        if (!matchedInsight) {
          failedChecks.push({
            label: `${label} did not match any insight group`,
          });
        } else {
          // Check links
          const link: string = (matchedInsight?.remediation?.link as string) ?? '';
          if (link !== req.remediation?.link) {
            failedChecks.push({
              label: `Links for ${label} do not match`,
              details: [
                `insight link: ${link}`,
                `expected link: ${req.remediation?.link ?? 'undefined'}`,
              ],
            });
          }

          // Check events
          const events = matchedInsight.events ?? [];
          const reqEvents = req.events ?? [];
          if (events.length !== reqEvents.length) {
            failedChecks.push({
              label: `Number of events for ${label} does not match`,
              details: [`insight events: ${events.length}`, `expected events: ${reqEvents.length}`],
            });
          }

          for (const event of events) {
            const reqEvent = reqEvents.find((e) => e.id === event.id);
            if (!reqEvent) {
              failedChecks.push({
                label: `Event with id "${event.id}" for ${label} was not expected`,
              });
            } else {
              if (reqEvent.endpointId !== event.endpointId) {
                failedChecks.push({
                  label: `Event with id "${event.id}" for ${label} has different endpoint IDs`,
                  details: [
                    `insight endpointId: ${event.endpointId}`,
                    `expected endpointId: ${reqEvent.endpointId}`,
                  ],
                });
              }
              if (reqEvent.value !== event.value) {
                failedChecks.push({
                  label: `Event with id "${event.id}" for ${label} has different values`,
                  details: [`insight value: ${event.value}`, `expected value: ${reqEvent.value}`],
                });
              }
            }
          }

          const similarityScore = getSimilarityScore(matchedInsight, req);
          allSimilarityScores.push(similarityScore);
        }
      }

      const avgSimilarityScore =
        allSimilarityScores.length > 0
          ? Number(
              (allSimilarityScores.reduce((a, b) => a + b, 0) / allSimilarityScores.length).toFixed(
                2
              )
            )
          : 0;

      const explanation = failedChecks.length
        ? `Failed checks:\n${failedChecks
            .map((c) =>
              c.details?.length ? `${c.label}:\n  - ${c.details.join('\n  - ')}` : c.label
            )
            .join('\n\n')}`
        : 'All checks passed';

      return {
        score: failedChecks.length ? 0 : avgSimilarityScore,
        label: failedChecks.length ? 'FAIL' : 'PASS',
        explanation,
        metadata: {
          similarityScore: avgSimilarityScore,
          failedCheckCount: failedChecks.length,
        },
      };
    },
  };
}

export interface DefendInsightsDatasetExample extends Example {
  input: DefendInsightsExampleInputWithOverrides;
  output: {
    insights: DefendInsights;
    reference?: string;
  };
}

export type EvaluateDefendInsightsDataset = ({
  dataset,
  endpointIds,
  insightType,
}: {
  dataset: {
    name: string;
    description: string;
    examples: DefendInsightsDatasetExample[];
  };
  endpointIds: string[];
  insightType?: DefendInsightType;
}) => Promise<void>;

export function createEvaluateDefendInsightsDataset({
  defendInsightsClient,
  evaluators,
  phoenixClient,
}: {
  defendInsightsClient: DefendInsightsEvaluationClient;
  evaluators: DefaultEvaluators;
  phoenixClient: KibanaPhoenixClient;
}): EvaluateDefendInsightsDataset {
  return async function evaluateDefendInsightsDataset({
    dataset: { name, description, examples },
    endpointIds,
    insightType = 'policy_response_failure',
  }) {
    const dataset = {
      name,
      description,
      examples,
    } satisfies EvaluationDataset;

    await phoenixClient.runExperiment(
      {
        dataset,
        task: async ({ input, output, metadata }) => {
          // Run Defend Insights with the input overrides from the dataset
          const result = await defendInsightsClient.evaluate({
            endpointIds:
              (input as DefendInsightsExampleInputWithOverrides).endpointIds ?? endpointIds,
            insightType:
              (input as DefendInsightsExampleInputWithOverrides).insightType ?? insightType,
            input: input as DefendInsightsExampleInputWithOverrides,
          });

          return {
            insights: result.insights,
            replacements: result.replacements,
            errors: result.errors,
            insightCount: result.insights?.length ?? 0,
          };
        },
      },
      [
        // Structural validation evaluator (CODE-based, validates insight structure)
        createDefendInsightsStructureEvaluator(),
        // Domain-specific policy response failure evaluator (validates against expected output)
        createPolicyResponseFailureEvaluator(),
      ]
    );
  };
}
