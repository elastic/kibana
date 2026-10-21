/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * @jest-environment jsdom
 */
// The sanitiser the card runs the brief through, DOMPurify, needs a DOM.

import { CUSTOM_CONTENT_MAX_HEIGHT } from '@kbn/custom-content-common';
import { sanitizeHtml } from '@kbn/custom-content-renderer';
import { renderBriefHtml } from './render_brief_html';
import type { BriefViewModel } from './view_model';

const fixtureViewModel: BriefViewModel = {
  version: 1,
  scope: {
    period: '7d',
    periodLabel: '7 days',
    capturedAt: '2026-10-20T10:53:48.134Z',
    spaceId: 'default',
    entityFilters: [],
  },
  notes: [],
  summary:
    'Five entities have alerts this period, including one privileged user newly rated high/critical and on the watchlist, and two hosts seen for the first time in the last few days.',
  counts: [
    { tileId: 'entitiesWithAlerts', title: 'Entities with alerts', value: 5, delta: 5 },
    { tileId: 'entitiesWithAnomalies', title: 'Entities with anomalies', value: 0 },
    { tileId: 'riskMovers', title: 'Risk movers', value: 0 },
    { tileId: 'newlyHighCritical', title: 'Newly high/critical', value: 1 },
    { tileId: 'watchlisted', title: 'Watchlisted', value: 1, delta: 0 },
    { tileId: 'newEntity', title: 'New entity', value: 2, delta: 2 },
  ],
  priorities: [
    {
      rank: 1,
      entityId: 'user:a.rodriguez@acme.example@okta',
      name: 'a.rodriguez',
      type: 'user',
      flaggedFor: ['Entities with alerts', 'Newly high/critical', 'Watchlisted'],
      risk: { score: 76, level: 'High', of: 'resolution group' },
      assetCriticality: 'High impact',
      privilegedUser: true,
      observed:
        'Has alerts, is newly high/critical, and sits on the watchlist, with risk score 76 (High).',
      whyItMatters:
        'Combines a privileged, high-impact identity with three separate flags, unlike any other entity here.',
      nextStep:
        'Review the alerts behind the new High risk score and confirm recent access activity.',
      riskHistory: {
        of: 'resolution group',
        from: '2026-10-13T10:53:48.134Z',
        to: '2026-10-20T10:53:48.134Z',
        points: [
          { t: '2026-10-15T23:00:00Z', score: 34.0, level: 'Low' },
          { t: '2026-10-16T23:00:00Z', score: 62.7, level: 'Moderate' },
          { t: '2026-10-17T23:00:00Z', score: 71.1, level: 'High' },
          { t: '2026-10-18T23:00:00Z', score: 73.7, level: 'High' },
          { t: '2026-10-19T23:00:00Z', score: 75.9, level: 'High' },
          { t: '2026-10-20T10:49:00Z', score: 75.9, level: 'High' },
        ],
      },
    },
    {
      rank: 2,
      entityId: 'host:2528d2a4-bab4-5027-95ea-2b43632c165d',
      name: 'docker-host-prod-01',
      type: 'host',
      flaggedFor: ['Entities with alerts', 'New entity'],
      risk: { score: 66, level: 'Moderate', of: 'entity' },
      assetCriticality: 'Extreme impact',
      firstSeen: '2 days ago',
      observed:
        'Flagged for alerts and as a new entity, first seen 2 days ago, asset criticality is Extreme impact, risk score 66 (Moderate).',
      whyItMatters:
        'Extreme impact criticality on a host seen for the first time this week raises the stakes of its alerts.',
      nextStep: "Check what triggered the alerts and verify the host's provisioning is expected.",
    },
    {
      rank: 3,
      entityId: 'host:3e751925-2b1c-5e66-969b-d8c23136e00d',
      name: 'jump-box-01',
      type: 'host',
      flaggedFor: ['Entities with alerts', 'New entity'],
      risk: { score: 58, level: 'Moderate', of: 'entity' },
      assetCriticality: 'High impact',
      firstSeen: '3 days ago',
      observed:
        'Flagged for alerts and as a new entity, first seen 3 days ago, asset criticality is High impact, risk score 58 (Moderate).',
      whyItMatters:
        'A newly appeared high-impact host with alerts warrants a look even without other flags.',
      nextStep: "Review the alerts and confirm the host's role and ownership.",
    },
  ],
  recommendation:
    'Start by reviewing the alerts and new High risk score tied to a.rodriguez, given its privileged, high-impact, multi-flagged status.',
};

const withText = (viewModel: BriefViewModel, wordCount: number): BriefViewModel => {
  const words = (count: number) => `${Array.from({ length: count }, () => 'steady').join(' ')}.`;
  return {
    ...viewModel,
    summary: words(wordCount * 2),
    recommendation: words(wordCount),
    priorities: viewModel.priorities.map((priority) => ({
      ...priority,
      observed: words(wordCount),
      whyItMatters: words(wordCount),
      nextStep: words(wordCount),
    })),
  };
};

describe('renderBriefHtml', () => {
  it('renders the fixture brief', () => {
    const { html } = renderBriefHtml(fixtureViewModel);

    expect(html).toMatchSnapshot();
    // The recommended step comes before the priorities, and there is no footer.
    expect(html.indexOf('Recommended next step')).toBeLessThan(html.indexOf('<h2>Priorities</h2>'));
    expect(html).not.toContain('<footer');
  });

  it('shows only the counts above zero or changed, and says when there is nothing to compare', () => {
    const { html } = renderBriefHtml(fixtureViewModel);

    expect(html.match(/class="count"/g)).toHaveLength(4);
    expect(html).not.toContain('Entities with anomalies');
    expect(html).toContain('+5');
    expect(html).toContain('No change');
    expect(html).toContain('No comparison');
  });

  it('escapes model text and names, so neither markup nor templates come back', () => {
    const { html } = renderBriefHtml({
      ...fixtureViewModel,
      summary: '<script>alert(1)</script> {{ 7 * 7 }}',
      priorities: [
        {
          ...fixtureViewModel.priorities[1],
          name: '<img src=x onerror=alert(1)>',
          nextStep: 'Check "{{ entity.id host:x }}".',
        },
      ],
    });

    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('{{');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &#123;&#123; 7 * 7 }}');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('says when nothing is flagged or worth prioritising', () => {
    const { html, height } = renderBriefHtml({
      ...fixtureViewModel,
      counts: [],
      priorities: [],
      recommendation: undefined,
    });

    expect(html).toContain('No entity in this view has enough evidence to prioritize.');
    expect(html).not.toContain('This period at a glance');
    expect(height).toBeLessThan(500);
  });

  it('keeps the chart and the chips however tall the brief is, and opens the card at its maximum', () => {
    const { html, height } = renderBriefHtml(withText(fixtureViewModel, 30));

    expect(html).toContain('<figure class="chart">');
    expect(html).toContain('<span class="chip">Entities with alerts</span>');
    expect(height).toBe(CUSTOM_CONTENT_MAX_HEIGHT);
  });

  it('passes through the sanitiser unchanged, so the card shows everything', () => {
    const { html } = renderBriefHtml(fixtureViewModel);
    const bodyOf = (document: string) =>
      new DOMParser().parseFromString(document, 'text/html').body.innerHTML;

    expect(bodyOf(sanitizeHtml(html))).toBe(bodyOf(html));
  });
});
