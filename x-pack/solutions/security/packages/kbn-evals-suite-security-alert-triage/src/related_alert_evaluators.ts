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
  evaluate: (params) =>
    classificationAccuracy.evaluate({
      ...params,
      output: { classification: parseVerdict(getFinalAssistantMessage(params.output)) },
    }),
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

/**
 * Guards the premise of the eval: the related alerts must actually reach the model. Fails when
 * the tool was never called or returned nothing, so a run on an empty correlation is not read as
 * a verdict on the command lines.
 */
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
