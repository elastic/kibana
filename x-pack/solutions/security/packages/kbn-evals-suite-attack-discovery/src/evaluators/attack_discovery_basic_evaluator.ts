/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput } from '../types';

export const ATTACK_DISCOVERY_BASIC_EVALUATOR_NAME = 'AttackDiscoveryBasic';

const nonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

/**
 * Validates a single insight regardless of the wire casing it arrived in.
 *
 * Direct-inference modes produce the camelCase `AttackDiscovery` shape, while
 * generateApi-mode tasks return the raw `GET /api/attack_discovery/_find` docs,
 * which use snake_case (`summary_markdown`, `details_markdown`, `alert_ids`).
 */
const isValidInsight = (insight: unknown): boolean => {
  if (typeof insight !== 'object' || insight === null) {
    return false;
  }

  const i = insight as Record<string, unknown>;
  const summaryMarkdown = i.summaryMarkdown ?? i.summary_markdown;
  const detailsMarkdown = i.detailsMarkdown ?? i.details_markdown;
  const alertIds = i.alertIds ?? i.alert_ids;

  const hasStrings =
    nonEmptyString(i.title) && nonEmptyString(summaryMarkdown) && nonEmptyString(detailsMarkdown);
  const hasAlertIds = Array.isArray(alertIds) && alertIds.every((id) => typeof id === 'string');

  return hasStrings && hasAlertIds;
};

export const createAttackDiscoveryBasicEvaluator = (): Evaluator<
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput
> => {
  return {
    name: ATTACK_DISCOVERY_BASIC_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output }) => {
      const insights = output?.insights;
      if (!insights || !Array.isArray(insights)) {
        return { score: 0, label: 'missing_insights' };
      }

      // `some`, not `find`: a falsy invalid element (null, 0, '') would be returned
      // by `find` as a falsy value and slip past the check.
      if (insights.some((i) => !isValidInsight(i))) {
        return { score: 0, label: 'invalid_shape' };
      }

      return { score: 1, label: 'ok' };
    },
  };
};
