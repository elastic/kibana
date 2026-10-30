/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DetectionRule } from '../../../data/rules/use_detection_rules';

export interface RuleMatchSeries {
  id: string;
  name: string;
  data: Array<{ x: number; y: number }>;
}

const OTHER_RULES = i18n.translate('xpack.nightshift.detectionPage.rules.otherRules', {
  defaultMessage: 'Other rules',
});

export const getTotalMatches = (rules: DetectionRule[]): number =>
  rules.reduce((total, rule) => total + rule.matches, 0);

export const buildRuleMatchSeries = (rules: DetectionRule[], maxRules = 5): RuleMatchSeries[] => {
  const ranked = rules
    .filter(({ matches }) => matches > 0)
    .sort((a, b) => b.matches - a.matches || a.query.title.localeCompare(b.query.title));
  const top = ranked.slice(0, maxRules).map(({ query, occurrences }) => ({
    id: query.id,
    name: query.title,
    data: occurrences,
  }));
  const rest = ranked.slice(maxRules);
  if (rest.length === 0) return top;
  const totals = new Map<number, number>();
  rest.forEach(({ occurrences }) =>
    occurrences.forEach(({ x, y }) => totals.set(x, (totals.get(x) ?? 0) + y))
  );
  return [
    ...top,
    {
      id: 'other-rules',
      name: OTHER_RULES,
      data: [...totals].sort(([a], [b]) => a - b).map(([x, y]) => ({ x, y })),
    },
  ];
};
