/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Example, Run } from 'langsmith';
import type { EvaluatorT } from 'langsmith/evaluation';
import type { DefendInsights, DefendInsight } from '@kbn/elastic-assistant-common';

import { EVALUATOR_ERRORS } from './constants';

export interface ExampleOutput {
  insights: DefendInsights;
}

export function isValidExampleOutput(output: ExampleOutput): output is ExampleOutput {
  // Check if output is an object and has the expected structure. It's defined in LangSmith, hence needs validation.
  return (
    output &&
    Array.isArray(output.insights) &&
    output.insights.every(
      (insight) =>
        typeof insight === 'object' &&
        insight !== null &&
        'group' in insight &&
        'events' in insight &&
        Array.isArray(insight.events) &&
        'remediation' in insight &&
        typeof insight.remediation?.message === 'string'
    )
  );
}

function failWithComment(comment: string): { key: string; score: number; comment: string } {
  return {
    key: 'correct',
    score: 0,
    comment,
  };
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

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

function getSimilarityScore(insight: DefendInsight, requirement: DefendInsight): number {
  const message = (insight.remediation?.message as string) ?? '';
  const reqMessage = (requirement.remediation?.message as string) ?? '';

  if (!message || !reqMessage) {
    return 0;
  }

  return cosineSimilarity(message, reqMessage);
}

export const customPolicyResponseFailureEvaluator: EvaluatorT = (
  run: Run,
  example: Example | undefined
) => {
  const expectedOutput = example?.outputs as ExampleOutput;
  if (!isValidExampleOutput(expectedOutput)) {
    return failWithComment(EVALUATOR_ERRORS.INVALID_OUTPUT_STRUCTURE);
  }

  const { insights: requirements } = expectedOutput;
  const insights: Record<string, DefendInsight> = (run.outputs?.insights ?? []).reduce(
    (acc: Record<string, DefendInsight>, insight: DefendInsight) => {
      acc[insight.group] = insight;
      return acc;
    },
    {} as Record<string, DefendInsight>
  );

  if (Object.keys(insights).length === 0) {
    return failWithComment(EVALUATOR_ERRORS.NO_RESULTS);
  }

  const failedChecks: Array<{ label: string; details?: string[] }> = [];

  // check if insight count matches requirement count
  if (Object.keys(insights).length !== requirements.length) {
    failedChecks.push({
      label: 'number of insight groups does not match number of requirements',
      details: [
        `insights: ${Object.keys(insights).length}`,
        `requirements: ${requirements.length}`,
      ],
    });
  }

  const allSimilarityScores: number[] = [];
  for (const req of requirements) {
    const label = `requirement "${req.group}"`;
    const matchedInsight = insights[req.group];

    if (!matchedInsight) {
      failedChecks.push({
        label: `${label} did not match any insight group`,
      });
    } else {
      // check links
      const link: string = (matchedInsight?.remediation?.link as string) ?? '';
      if (link !== req.remediation?.link) {
        failedChecks.push({
          label: `Links for ${label} is not matching`,
          details: [
            `insight: ${JSON.stringify(matchedInsight)}`,
            `requirement: ${JSON.stringify(req)}`,
          ],
        });
      }

      // check events
      const events = matchedInsight.events ?? [];
      const reqEvents = req.events ?? [];
      if (events.length !== reqEvents.length) {
        failedChecks.push({
          label: `Number of events for ${label} is not matching`,
          details: [
            `insight: ${JSON.stringify(matchedInsight)}`,
            `requirement: ${JSON.stringify(req)}`,
          ],
        });
      }
      for (const event of events) {
        const reqEvent = reqEvents.find((e) => e.id === event.id);
        if (!reqEvent) {
          failedChecks.push({
            label: `Event with id "${event.id}" for ${label} is not matching`,
          });
        }
        if (reqEvent?.endpointId !== event.endpointId) {
          failedChecks.push({
            label: `Event with id "${event.id}" for ${label} has different endpoint IDs`,
            details: [
              `insight: ${JSON.stringify(matchedInsight)}`,
              `requirement: ${JSON.stringify(req)}`,
            ],
          });
        }
        if (reqEvent?.value !== event.value) {
          failedChecks.push({
            label: `Event with id "${event.id}" for ${label} has different values`,
            details: [
              `insight: ${JSON.stringify(matchedInsight)}`,
              `requirement: ${JSON.stringify(req)}`,
            ],
          });
        }
      }

      const similarityScore = getSimilarityScore(matchedInsight, req);
      allSimilarityScores.push(similarityScore);
    }
  }

  const score =
    allSimilarityScores.length > 0
      ? Number(
          (allSimilarityScores.reduce((a, b) => a + b, 0) / allSimilarityScores.length).toFixed(2)
        )
      : 0;

  const comment = failedChecks.length
    ? `Failed checks:\n${failedChecks
        .map((c) => (c.details?.length ? `${c.label}:\n  - ${c.details.join('\n  - ')}` : c.label))
        .join('\n\n')}`
    : 'All checks passed';

  return {
    key: 'correct',
    score: failedChecks.length ? 0 : score,
    comment,
  };
};
