/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DetectionRule } from '../../../data/rules/use_detection_rules';
import { buildRuleMatchSeries, getTotalMatches } from './rule_match_series';

const rule = (id: string, title: string, a: number, b: number): DetectionRule => ({
  query: { id, title } as DetectionRule['query'],
  sourceId: 'source',
  occurrences: [
    { x: 1, y: a },
    { x: 2, y: b },
  ],
  matches: a + b,
  lastActivity: b > 0 ? 2 : a > 0 ? 1 : undefined,
});

describe('rule match series', () => {
  it('ranks the top five by matches, ties by title, and sums the rest', () => {
    const rules = [
      rule('zero', 'Zero', 0, 0),
      rule('z', 'Zed', 3, 2),
      rule('a', 'Alpha', 3, 2),
      rule('c', 'C', 4, 0),
      rule('d', 'D', 1, 2),
      rule('e', 'E', 2, 0),
      rule('f', 'F', 1, 0),
      rule('g', 'G', 0, 1),
    ];
    const series = buildRuleMatchSeries(rules);
    expect(series.map(({ id }) => id)).toEqual(['a', 'z', 'c', 'd', 'e', 'other-rules']);
    expect(series[5].data).toEqual([
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ]);
    expect(getTotalMatches(rules)).toBe(21);
  });

  it('omits zero-match rules and other when at most five match', () => {
    expect(
      buildRuleMatchSeries([rule('a', 'A', 1, 0), rule('b', 'B', 0, 0)]).map(({ id }) => id)
    ).toEqual(['a']);
  });
});
