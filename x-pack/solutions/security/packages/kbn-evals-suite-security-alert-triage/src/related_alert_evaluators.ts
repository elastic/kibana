/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getFinalAssistantMessage,
  getToolCallSteps,
  type Evaluator,
  type TaskOutput,
} from '@kbn/evals';
import {
  CLASSIFICATIONS,
  classificationAccuracy,
  type Classification,
} from '@kbn/evals-suite-alert-analysis-workflow';

export const GET_RELATED_ALERTS_TOOL_ID = 'security.alert-analysis.get-related-alerts';

const VERDICT_LINE = new RegExp(
  `^[\\s*\`_>#-]*verdict\\s*:\\s*[*\`_\\s]*(${CLASSIFICATIONS.join('|')})[*\`_.\\s]*$`,
  'i'
);

/** The last `Verdict: <classification>` line of a reply, or undefined when there is none. */
export const parseVerdict = (message: string): Classification | undefined => {
  const lines = message.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = VERDICT_LINE.exec(lines[i]);
    if (match) {
      return match[1].toLowerCase() as Classification;
    }
  }
  return undefined;
};

/** Same scoring as the workflow suite's `ClassificationAccuracy`, fed with the parsed reply. */
export const verdictAccuracy: Evaluator = {
  ...classificationAccuracy,
  evaluate: async (params) => {
    const { score, label, explanation, metadata } = await classificationAccuracy.evaluate({
      ...params,
      output: { classification: parseVerdict(getFinalAssistantMessage(params.output)) },
    });
    return {
      score,
      label,
      explanation,
      metadata: { predicted: metadata?.predicted, expected: metadata?.expected },
    };
  },
};

export const verdictParsed: Evaluator = {
  name: 'VerdictParsed',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const verdict = parseVerdict(getFinalAssistantMessage(output));
    return { score: verdict ? 1 : 0, label: verdict ?? 'missing' };
  },
};

const countRelatedAlerts = (results: unknown[] | undefined): number =>
  (results ?? []).reduce<number>((total, result) => {
    const relatedAlerts = (result as { data?: { relatedAlerts?: unknown } } | undefined)?.data
      ?.relatedAlerts;
    return total + (Array.isArray(relatedAlerts) ? relatedAlerts.length : 0);
  }, 0);

/** Premise check: scores 0 when the tool was never called or returned no related alerts. */
export const relatedAlertsRetrieved: Evaluator = {
  name: 'RelatedAlertsRetrieved',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async ({ output }) => {
    const calls = getToolCallSteps(output as TaskOutput).filter(
      ({ tool_id: toolId }) => toolId === GET_RELATED_ALERTS_TOOL_ID
    );
    const relatedCount = calls.reduce(
      (total, { results }) => total + countRelatedAlerts(results),
      0
    );
    const label = calls.length === 0 ? 'not_called' : relatedCount === 0 ? 'empty' : 'found';
    return {
      score: label === 'found' ? 1 : 0,
      label,
      metadata: { toolCalls: calls.length, relatedCount },
    };
  },
};

/** Headline metric: credits the verdict only when related alerts were actually retrieved. */
export const verdictAccuracyWithRelated: Evaluator = {
  name: 'VerdictAccuracyWithRelated',
  kind: 'CODE',
  direction: 'maximize',
  evaluate: async (params) => {
    const related = await relatedAlertsRetrieved.evaluate(params);
    if (related.score !== 1) {
      return {
        score: 0,
        label: 'premise_unmet',
        explanation: `get-related-alerts ${related.label}; verdict not credited`,
        metadata: related.metadata,
      };
    }
    const verdict = await verdictAccuracy.evaluate(params);
    return { score: verdict.score, label: verdict.label, explanation: verdict.explanation };
  },
};
