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
import { NO_PRIORITIES_TITLE, QUIET_LINE, QUIET_TITLE } from './view_model';

const fixtureViewModel: BriefViewModel = {
  version: 1,
  scope: {
    period: '7d',
    periodLabel: '7 days',
    capturedAt: '2026-10-20T10:53:48.134Z',
    spaceId: 'default',
    entityFilters: [],
  },
  notChecked: { unreadable: [] },
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
      risk: { score: 76, level: 'High', of: 'resolution group' },
      assetCriticality: 'high_impact',
      watchlists: ['Privileged User'],
      assessment:
        'Credential and remote access activity on a privileged identity newly at High risk is the shape of account misuse.',
      whyFirst:
        'Privilege and a fresh threshold crossing make it the clearest place to confirm first.',
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
      risk: { score: 66, level: 'Moderate', of: 'entity' },
      assetCriticality: 'extreme_impact',
      watchlists: [],
      firstSeen: '2 days ago',
      assessment:
        'A host that appeared this week and is already alerting looks more like a provisioning problem.',
      whyFirst: 'A new asset of this criticality is worth confirming on its own.',
      nextStep: "Check what triggered the alerts and verify the host's provisioning is expected.",
    },
    {
      rank: 3,
      entityId: 'host:3e751925-2b1c-5e66-969b-d8c23136e00d',
      name: 'jump-box-01',
      type: 'host',
      risk: { score: 58, level: 'Moderate', of: 'entity' },
      assetCriticality: 'high_impact',
      watchlists: [],
      firstSeen: '3 days ago',
      assessment:
        'A new host with alerts of the same kind as the first priority is worth a second look.',
      whyFirst:
        'Its recent appearance and the overlap in alert type put it ahead of the other hosts.',
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
      assessment: words(wordCount),
      whyFirst: words(wordCount),
      nextStep: words(wordCount),
    })),
  };
};

describe('renderBriefHtml', () => {
  it('renders the fixture brief', () => {
    const { html } = renderBriefHtml(fixtureViewModel);

    expect(html).toContain("@font-face{font-family:'Elastic UI Numeric'");
    expect(html.replace(/base64,[^)]+/, 'base64,…')).toMatchSnapshot();
    // The recommended step comes before the priorities, and there is no footer.
    expect(html.indexOf('Recommended next step')).toBeLessThan(
      html.indexOf('<h2>Entities to investigate first</h2>')
    );
    expect(html).not.toContain('<footer');
  });

  it('loads its template and its stylesheet', () => {
    const { html } = renderBriefHtml(fixtureViewModel);

    expect(html).toContain('<div class="brief">');
    expect(html).toContain('.brief .priority{');
  });

  it('lists first seen and every watchlist in one line under the badges, and makes room when it wraps', () => {
    const withFacts = (watchlists: string[], firstSeen?: string) => ({
      ...fixtureViewModel,
      priorities: [{ ...fixtureViewModel.priorities[0], watchlists, firstSeen }],
    });
    const key = (label: string) => `<span class="fact-key">${label}:</span>`;

    const { html } = renderBriefHtml(
      withFacts(['One', 'Two', 'Three', 'Four', 'Five'], '2 days ago')
    );
    expect(html).toContain(
      `<p class="fact">${key('First seen')} 2 days ago · ${key(
        'Watchlist'
      )} One, Two, Three, Four, Five</p>`
    );
    expect(renderBriefHtml(withFacts(['One'])).html).toContain(
      `<p class="fact">${key('Watchlist')} One</p>`
    );

    const withoutFacts = renderBriefHtml(withFacts([])).html;
    expect(withoutFacts).not.toContain(key('First seen'));
    expect(withoutFacts).not.toContain(key('Watchlist'));
    expect(
      renderBriefHtml(withFacts(['a', 'b', 'c'].map((letter) => letter.repeat(100)))).height
    ).toBeGreaterThan(renderBriefHtml(withFacts(['Privileged User'])).height + 30);
  });

  it('writes the risk badge as level then score, with the resolution icon only for a group', () => {
    const withRisk = (of: 'entity' | 'resolution group') => ({
      ...fixtureViewModel,
      priorities: [
        {
          ...fixtureViewModel.priorities[0],
          risk: { score: 98, level: 'Critical', of },
        },
      ],
    });

    const own = renderBriefHtml(withRisk('entity')).html;
    expect(own).toContain('<span class="badge risk level-critical">Risk: Critical, 98</span>');
    expect(own).not.toContain('aria-label="resolution group"');
    expect(renderBriefHtml(withRisk('resolution group')).html).toMatch(
      /<span class="badge risk level-critical"><svg [^>]*aria-label="resolution group">.*<\/svg>Risk: Critical, 98<\/span>/
    );
  });

  it("heads the card with the model's title, or a fixed one, and lists the view under it", () => {
    const withTitle = renderBriefHtml({
      ...fixtureViewModel,
      title: 'Alerts spread across hosts',
    }).html;
    expect(withTitle).toContain('<h1>Alerts spread across hosts</h1>');
    expect(withTitle).toContain(
      '<p class="fact"><span class="fact-key">Generated:</span> 20 Oct 2026, 10:53 UTC · <span class="fact-key">Time range:</span> Last 7 days</p>'
    );
    expect(withTitle).not.toContain('fact-key">Coverage');
    expect(withTitle).not.toContain('fact-key">Not included');

    const withoutTitle = renderBriefHtml(fixtureViewModel).html;
    expect(withoutTitle).toContain(`<h1>${NO_PRIORITIES_TITLE}</h1>`);
    const quiet = renderBriefHtml({ ...fixtureViewModel, summary: QUIET_LINE }).html;
    expect(quiet).toContain(`<h1>${QUIET_TITLE}</h1>`);
  });

  it('puts the filters, selected tile and space after the time range, then Coverage and Not included when they apply, all in one line', () => {
    const { html } = renderBriefHtml({
      ...fixtureViewModel,
      scope: {
        ...fixtureViewModel.scope,
        spaceId: 'soc',
        focusTileTitle: 'Risk movers',
        entityFilters: [
          { label: 'Risk level', value: 'Critical, High' },
          { label: 'Watchlist', value: '2 selected' },
        ],
        sample: 'Based on the 25 highest-ranked of at least 2,670 flagged entities',
      },
      notChecked: {
        unreadable: ['Entities with anomalies', 'alert details'],
        notFound: '3 flagged entities not found in the Entity Store',
      },
    });
    const key = (label: string) => `<span class="fact-key">${label}:</span>`;
    expect(html).toContain(
      `${key('Time range')} Last 7 days · ${key('Risk level')} Critical, High · ${key(
        'Watchlist'
      )} 2 selected · ${key('Attention tile')} Risk movers · ${key('Space')} soc · ${key(
        'Coverage'
      )} Based on the 25 highest-ranked of at least 2,670 flagged entities; 3 flagged entities not found in the Entity Store · ${key(
        'Not included'
      )} Entities with anomalies, alert details (data couldn&#39;t be loaded)</p>`
    );
  });

  it('shows Coverage for missing entities alone, without a sample', () => {
    const { html } = renderBriefHtml({
      ...fixtureViewModel,
      notChecked: {
        unreadable: [],
        notFound: '3 flagged entities not found in the Entity Store',
      },
    });
    expect(html).toContain(
      '<span class="fact-key">Coverage:</span> 3 flagged entities not found in the Entity Store</p>'
    );
    expect(html).not.toContain('fact-key">Not included');
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

  it('says when the model found nothing to prioritise', () => {
    const { html, height } = renderBriefHtml({
      ...fixtureViewModel,
      summary: undefined,
      counts: [],
      priorities: [],
      recommendation: undefined,
    });

    expect(html).toContain('<h2>Entities to investigate first</h2>');
    expect(html).toContain('No entity in this view has enough evidence to prioritize.');
    expect(html).not.toContain('This period at a glance');
    expect(height).toBeLessThan(500);
  });

  it('says it once, in the summary, when there was no model call to find priorities', () => {
    const noPriorities = 'No entity in this view has enough evidence to prioritize.';
    const { html } = renderBriefHtml({
      ...fixtureViewModel,
      summary: noPriorities,
      priorities: [],
      recommendation: undefined,
    });

    expect(html.split(noPriorities)).toHaveLength(2);
    expect(html).not.toContain('<h2>Priorities</h2>');
  });

  it('keeps the chart however tall the brief is, and opens the card at its maximum', () => {
    const { html, height } = renderBriefHtml(withText(fixtureViewModel, 30));

    expect(html).toContain('<svg viewBox="0 0 640');
    expect(height).toBe(CUSTOM_CONTENT_MAX_HEIGHT);
  });

  it('draws the chart from three points, and states the change in words from two', () => {
    const [{ riskHistory }] = fixtureViewModel.priorities;
    const withPoints = (count: number) =>
      renderBriefHtml({
        ...fixtureViewModel,
        priorities: [
          {
            ...fixtureViewModel.priorities[0],
            riskHistory: riskHistory && {
              ...riskHistory,
              points: riskHistory.points.slice(-count),
            },
          },
        ],
      }).html;

    expect(withPoints(3)).toContain('<svg viewBox="0 0 640');
    expect(withPoints(2)).not.toContain('<svg viewBox="0 0 640');
    expect(withPoints(2)).toContain('76 High');
    expect(withPoints(1)).not.toContain('<figure');
  });

  it('passes through the sanitiser unchanged, so the card shows everything', () => {
    const { html } = renderBriefHtml(fixtureViewModel);
    const bodyOf = (document: string) =>
      new DOMParser().parseFromString(document, 'text/html').body.innerHTML;

    expect(bodyOf(sanitizeHtml(html))).toBe(bodyOf(html));
  });
});
