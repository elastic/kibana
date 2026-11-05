/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BriefViewModel,
  formatBriefRepresentation,
} from '../../../../../common/entity_analytics/ai_brief/result';

const brief = {
  version: 1,
  scope: {
    period: '7d',
    periodLabel: '7 days',
    capturedAt: '2026-10-14T12:00:00.000Z',
    spaceId: 'default',
    entityFilters: [],
    sample: '3 of 5 flagged entities read',
  },
  notChecked: { unreadable: [], notFound: '2 flagged entities not found in the Entity Store' },
  summary: 'Three entities need review.',
  counts: [
    { tileId: 'riskMovers', title: 'Risk movers', value: 3 },
    { tileId: 'newlyHighCritical', title: 'Newly high/critical', value: 0, delta: 1 },
  ],
  priorities: [
    {
      rank: 1,
      entityId: 'host:a',
      name: 'host-a',
      type: 'host',
      watchlists: [],
      assessment: 'First.',
      whyFirst: 'Highest risk.',
      nextStep: 'Review it.',
    },
    {
      rank: 2,
      entityId: 'user:b',
      name: 'user-b',
      type: 'user',
      risk: { score: 82, level: 'High', of: 'resolution group' },
      assetCriticality: 'extreme_impact',
      firstSeen: '2026-10-01T00:00:00.000Z',
      watchlists: ['Privileged Users'],
      assessment: 'Second.',
      whyFirst: 'Second evidence.',
      nextStep: 'Check its alerts.',
      riskHistory: {
        of: 'resolution group',
        from: '2026-10-07T12:00:00.000Z',
        to: '2026-10-14T12:00:00.000Z',
        points: [
          { t: '2026-10-07T12:00:00.000Z', score: 41, level: 'Moderate' },
          { t: '2026-10-14T12:00:00.000Z', score: 82, level: 'High' },
        ],
      },
    },
  ],
};

describe('Entity Analytics AI brief result', () => {
  it('preserves captured scope and the ordered priority evidence in the representation', () => {
    const parsed = BriefViewModel.parse(brief);
    const text = formatBriefRepresentation(parsed);
    expect(parsed.scope.sample).toBe('3 of 5 flagged entities read');
    expect(text).toContain('space default');
    expect(text).toContain('Coverage: 3 of 5 flagged entities read');
    expect(text).toContain('Not found: 2 flagged entities not found in the Entity Store');
    expect(text.indexOf('Priority 1:')).toBeLessThan(text.indexOf('Priority 2:'));
    expect(text).toContain('Priority 2: user-b (user:b, user)');
    expect(text).toContain('Risk: High, 82 (resolution group)');
    expect(text).toContain('Asset criticality: extreme_impact');
    expect(text).toContain('First seen: 2026-10-01T00:00:00.000Z');
    expect(text).toContain('Watchlists: Privileged Users');
    expect(text).toContain('Why prioritized: Second evidence.');
    expect(text).toContain(
      'Risk history: resolution group, 2026-10-07T12:00:00.000Z to 2026-10-14T12:00:00.000Z'
    );
    expect(text).toContain('- 2026-10-14T12:00:00.000Z: 82 (High)');
    expect(text).toContain('no previous-period comparison was available');
    expect(text).toContain(
      'Newly high/critical: 0 (shown as — in the brief); +1 from the previous 7 days'
    );
  });

  it('rejects an unknown stored schema version', () => {
    expect(BriefViewModel.safeParse({ ...brief, version: 2 }).success).toBe(false);
  });

  it('keeps unavailable evidence distinct from empty content', () => {
    const unavailable = formatBriefRepresentation(
      BriefViewModel.parse({
        ...brief,
        counts: [],
        priorities: [],
        notChecked: { unreadable: ['risk history'] },
      })
    );
    const empty = formatBriefRepresentation(
      BriefViewModel.parse({
        ...brief,
        counts: [],
        priorities: [],
        notChecked: { unreadable: [] },
      })
    );
    expect(unavailable).toContain('Unavailable: risk history');
    expect(empty).not.toContain('Unavailable:');
    expect(empty).toContain('Scope: 7d (last 7 days), space default');
  });
});
