/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DefaultEvaluators, Evaluator } from '@kbn/evals';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

const truncateInsightsForRubric = (
  insights: AttackDiscovery[] | null | undefined
): Array<{
  title: string;
  summaryMarkdown: string;
  detailsMarkdown: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics?: string[];
  alertIds: string[];
}> => {
  if (!insights || !Array.isArray(insights)) {
    return [];
  }

  return insights.map((insight) => ({
    title: insight.title ?? '',
    summaryMarkdown: insight.summaryMarkdown ?? '',
    detailsMarkdown: insight.detailsMarkdown ?? '',
    entitySummaryMarkdown: insight.entitySummaryMarkdown ?? '',
    mitreAttackTactics: insight.mitreAttackTactics ?? [],
    alertIds: insight.alertIds ?? [],
  }));
};

export const createAttackDiscoveryRubricEvaluator = ({
  evaluators,
}: {
  evaluators: DefaultEvaluators;
}): Evaluator<AttackDiscoveryAgentBuilderExample, AttackDiscoveryAgentBuilderTaskOutput> => {
  return {
    name: 'Rubric',
    kind: 'LLM',
    direction: 'maximize',
    evaluate: async ({ expected, output, input, metadata }) => {
      const referenceInsights = truncateInsightsForRubric(expected?.attackDiscoveries);
      // Without a reference discovery there is nothing for the judge to compare
      // against: rubric item 1 alone would score the submission N and pin the
      // aggregate at a ceiling. Mirrors the `criteria.length === 0` guard in
      // attack_discovery_criteria_evaluator.
      if (referenceInsights.length === 0) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'No reference attack discoveries — skipping rubric evaluation.',
        };
      }

      const submissionInsights = truncateInsightsForRubric(output?.insights);

      const submission = JSON.stringify({ attackDiscoveries: submissionInsights }, null, 2);
      const reference = JSON.stringify({ attackDiscoveries: referenceInsights }, null, 2);

      const rubric = [
        'Evaluate the submission against the reference using these 7 rubric items:',
        '1. Is the submission non-empty and well-formed JSON with an array of attackDiscoveries?',
        '2. Do the detailsMarkdown values capture the overall essence of the reference, allowing slight differences in wording but not omitting or misrepresenting key incidents?',
        '3. Does the submission mention at least half of the same entities (host or user) as the reference?',
        '4. Are the summaryMarkdown values at least partially similar and summarizing the same incidents?',
        '5. Are the title values at least partially similar and mentioning the same incidents?',
        '6. Do more than half of the alertIds in the submission overlap with the alertIds in the reference?',
        '7. Are the MITRE tactics consistent with the reference?',
        `Reference: ${reference}`,
        'Score the submission as passing if at least 5 of the 7 rubric items are correct. Explain your reasoning briefly and end with a single character: Y or N.',
      ].join('\n');

      try {
        return await evaluators.criteria([rubric]).evaluate({
          input,
          expected: { expected: reference },
          output: {
            messages: [{ message: submission }],
            steps: [],
            errors: output?.errors ?? [],
          },
          metadata,
        });
      } catch (error) {
        return {
          score: null,
          label: 'judge_failed',
          explanation: `Rubric judge failed to evaluate the submission: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    },
  };
};
