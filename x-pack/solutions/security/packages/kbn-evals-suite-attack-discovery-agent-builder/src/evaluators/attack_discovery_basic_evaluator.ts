/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import { expectsAttackDiscovery } from '../constants';
import type {
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput,
} from '../types';

export const ATTACK_DISCOVERY_BASIC_EVALUATOR_NAME = 'AttackDiscoveryBasic';

export const createAttackDiscoveryBasicEvaluator = (): Evaluator<
  AttackDiscoveryAgentBuilderExample,
  AttackDiscoveryAgentBuilderTaskOutput
> => {
  return {
    name: ATTACK_DISCOVERY_BASIC_EVALUATOR_NAME,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }) => {
      if (!expectsAttackDiscovery(expected?.expectedToolPath)) {
        return {
          score: null,
          label: 'N/A',
          explanation: 'Example does not produce Attack Discovery insights — nothing to score.',
        };
      }

      const insights = output?.insights;
      if (!insights || !Array.isArray(insights)) {
        return { score: 0, label: 'missing_insights' };
      }

      const invalid = insights.find((i) => {
        const hasStrings =
          typeof i.title === 'string' &&
          i.title.length > 0 &&
          typeof i.summaryMarkdown === 'string' &&
          i.summaryMarkdown.length > 0 &&
          typeof i.detailsMarkdown === 'string' &&
          i.detailsMarkdown.length > 0;
        const hasAlertIds =
          Array.isArray(i.alertIds) && i.alertIds.every((id) => typeof id === 'string');

        return !hasStrings || !hasAlertIds;
      });

      if (invalid) {
        return { score: 0, label: 'invalid_shape' };
      }

      return { score: 1, label: 'ok' };
    },
  };
};
