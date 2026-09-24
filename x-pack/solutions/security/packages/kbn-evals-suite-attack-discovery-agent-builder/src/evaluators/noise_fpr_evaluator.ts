/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type {
  AttackDiscovery,
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

const collectInsightAlertIds = (insights: AttackDiscovery[] | null | undefined): string[] => {
  if (!insights || !Array.isArray(insights)) {
    return [];
  }
  return insights.flatMap((insight) => insight.alertIds ?? []);
};

// A forbidden noise ID is user-visible wherever the insight cites it: the
// structured alertIds list AND the rendered Markdown fields. An insight with
// `alertIds: []` but a noise citation in `detailsMarkdown` still fails.
const escapeRegExp = (value: string): string => value.replace(/[$()*+?.^[\]\\{|}]/g, '\\$&');

const citedIn = (field: string, alertId: string): boolean =>
  new RegExp(`(?<![\\w-])${escapeRegExp(alertId)}(?![\\w-])`).test(field);

const forbiddenIdsCitedInMarkdown = (
  insights: AttackDiscovery[] | null | undefined,
  forbiddenAlertIds: string[]
): string[] =>
  forbiddenAlertIds.filter((alertId) =>
    (insights ?? []).some((insight) =>
      [insight.summaryMarkdown, insight.detailsMarkdown]
        .filter((field): field is string => typeof field === 'string')
        .some((field) => citedIn(field, alertId))
    )
  );

export const createNoiseFalsePositiveEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'NoiseFalsePositive',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const forbiddenAlertIds = expected?.forbiddenAlertIds ?? [];
    if (forbiddenAlertIds.length === 0) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No forbidden noise alert IDs defined for this example.',
      };
    }

    const citedAlertIds = collectInsightAlertIds(output.insights);
    const markdownViolations = forbiddenIdsCitedInMarkdown(output.insights, forbiddenAlertIds);
    const violations = [
      ...citedAlertIds.filter((alertId) => forbiddenAlertIds.includes(alertId)),
      ...markdownViolations,
    ];

    if (violations.length > 0) {
      return {
        score: 0,
        explanation: `Insights cited ${violations.length} noise alert(s): ${violations.join(', ')}`,
        metadata: { violations, citedAlertIds },
      };
    }

    return {
      score: 1,
      explanation: 'No noise-cluster or background alert IDs cited in insights.',
      metadata: { citedAlertIds },
    };
  },
});

export const createDiscoveryCountCapEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'DiscoveryCountCap',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const maxDiscoveryCount = expected?.maxDiscoveryCount;
    if (maxDiscoveryCount == null) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No discovery count cap defined for this example.',
      };
    }

    // The cap guards against EXCESS, so every observable count is held to it:
    // taking the first non-null would let a run report 7 via the tool count
    // while rendering 15 insights (12-cap) and pass. The max of the available
    // sources is the honest worst case.
    const observedCounts = [
      output.adToolResult?.discoveryCount,
      output.workflow.validatedDiscoveryCount,
      output.insights?.length,
    ].filter((count): count is number => typeof count === 'number');

    const discoveryCount = observedCounts.length > 0 ? Math.max(...observedCounts) : 0;

    if (discoveryCount > maxDiscoveryCount) {
      return {
        score: 0,
        explanation: `Discovery count ${discoveryCount} exceeds cap ${maxDiscoveryCount}.`,
        metadata: { discoveryCount, maxDiscoveryCount },
      };
    }

    return {
      score: 1,
      explanation: `Discovery count ${discoveryCount} is within cap ${maxDiscoveryCount}.`,
      metadata: { discoveryCount, maxDiscoveryCount },
    };
  },
});

export const createMinValidatedDiscoveryEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => ({
  name: 'MinValidatedDiscovery',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output, expected }) => {
    const minValidatedDiscoveryCount = expected?.minValidatedDiscoveryCount;
    if (minValidatedDiscoveryCount == null) {
      return {
        score: null,
        label: 'N/A',
        explanation: 'No minimum validated discovery count defined for this example.',
      };
    }

    // A validated discovery is one the pipeline VALIDATED (workflow evidence)
    // or the AD tool completed and counted. `insights` is parsed from
    // model-authored message/reasoning content and carries no proof that
    // validation ran, so a hallucinated fenced insight must NOT satisfy this
    // floor — the metric guards against a vacuous FPR pass on a run that
    // never produced a validated discovery.
    const validatedCount =
      output.workflow.validatedDiscoveryCount ?? output.adToolResult?.discoveryCount ?? 0;

    if (validatedCount < minValidatedDiscoveryCount) {
      return {
        score: 0,
        explanation: `Validated discovery count ${validatedCount} is below minimum ${minValidatedDiscoveryCount}.`,
        metadata: { validatedCount, minValidatedDiscoveryCount },
      };
    }

    return {
      score: 1,
      explanation: `Validated discovery count ${validatedCount} meets minimum ${minValidatedDiscoveryCount}.`,
      metadata: { validatedCount, minValidatedDiscoveryCount },
    };
  },
});
