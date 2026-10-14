/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { CandidateEntities } from './fetch_candidate_entities';
import { NO_PRIORITIES_LINE, QUIET_LINE, renderBrief } from './render_brief';

const scopeWith = (overrides: Partial<EntityAnalyticsScope>): EntityAnalyticsScope => ({
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: {},
  ...overrides,
});

const noEntities: CandidateEntities = {
  candidates: [],
  capturedCount: 0,
  notFoundCount: 0,
  matchedCount: 0,
  hasPageQuery: false,
  pageQueryFailed: false,
  dataTimestamp: '2026-10-14T11:55:00.000Z',
};

const hostA: CandidateEntities = {
  ...noEntities,
  candidates: [{ id: 'host:a', name: 'web_01', type: 'host', tileIds: ['riskMovers'], record: {} }],
  capturedCount: 1,
  matchedCount: 1,
};

describe('renderBrief', () => {
  it('renders the quiet case without priorities', () => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: { value: 0, delta: 0, entityIds: [] } } }),
      spaceId: 'default',
      entities: noEntities,
    });
    expect(brief).toContain(QUIET_LINE);
    expect(brief).not.toContain('**Priorities**');
    expect(brief).toContain(
      '**Scope:** last 7 days (2026-10-07 12:00 UTC to 2026-10-14 12:00 UTC) · space default · captured 2026-10-14 12:00 UTC · entity data as of 2026-10-14 11:55 UTC'
    );
    expect(brief).toContain("_Checked: 0 entities from the page's tiles._");
  });

  it('does not call a view quiet when tiles flagged entities that were not checked', () => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: { value: 2, entityIds: ['host:x'] } } }),
      spaceId: 'default',
      entities: { ...noEntities, capturedCount: 1, notFoundCount: 1 },
    });
    expect(brief).toContain(NO_PRIORITIES_LINE);
    expect(brief).toContain('_1 tile entities were not found in the Entity Store._');
    expect(brief).toContain("_Checked: 0 of 1 entities from the page's tiles._");
  });

  it('says the riskiest were checked first only when the cap cut matched entities', () => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: { value: 640, entityIds: ['host:a'] } } }),
      spaceId: 'default',
      entities: { ...hostA, capturedCount: 640, matchedCount: 600 },
    });
    expect(brief).toContain(
      "_Checked: 1 of 640 entities from the page's tiles, highest risk first._"
    );
  });

  it('picks the selected tile, then the largest movement, and never sums', () => {
    const brief = renderBrief({
      scope: scopeWith({
        focusTileId: 'newEntity',
        tiles: {
          entitiesWithAlerts: { value: 10, delta: 2, entityIds: [] },
          entitiesWithAnomalies: { value: 4, entityIds: [] },
          riskMovers: { value: 0, unavailable: true, entityIds: [] },
          newlyHighCritical: { value: 3, delta: -5, entityIds: [] },
          watchlisted: { value: 1, delta: 0, entityIds: [] },
          newEntity: { value: 7, entityIds: [] },
        },
      }),
      spaceId: 'default',
      entities: noEntities,
    });
    expect(brief).toContain(
      [
        '| New entity | 7 | no comparison |',
        '| Newly high/critical | 3 | -5 vs previous 7d |',
        '| Entities with alerts | 10 | +2 vs previous 7d |',
      ].join('\n')
    );
    expect(brief).toContain('_Unavailable tiles: Risk movers._');
  });

  it.each([
    [
      'no change',
      { value: 1, delta: 0, entityIds: [] },
      '| Risk movers | 1 | no change vs previous 7d |',
    ],
    ['no comparison', { value: 1, entityIds: [] }, '| Risk movers | 1 | no comparison |'],
    [
      'unavailable',
      { value: 0, unavailable: true as const, entityIds: [] },
      '| Risk movers | unavailable | unavailable |',
    ],
  ])('renders %s', (_name, tile, row) => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: tile } }),
      spaceId: 'default',
      entities: noEntities,
    });
    expect(brief).toContain(row);
  });

  it('replaces mentions with bold names and renders numbered priorities', () => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: { value: 1, delta: 1, entityIds: ['host:a'] } } }),
      spaceId: 'default',
      entities: hostA,
      verified: {
        attention: '{{ entity.id host:a }} rose sharply',
        priorities: [
          {
            entityId: 'host:a',
            observed: 'Risk rose',
            whyItMatters: 'High impact asset.',
            nextStep: 'Review its alerts',
            factIds: [1],
          },
        ],
        droppedPriorityCount: 0,
      },
      entityTableTag: '<render_attachment id="x" version="1" />',
    });
    expect(brief).toContain('**What needs attention**\n**web\\_01** rose sharply');
    expect(brief).toContain(
      '1. **web\\_01**: Risk rose. High impact asset. _Next:_ Review its alerts.'
    );
    expect(brief).toContain('<render_attachment id="x" version="1" />');
  });

  it('renders the no-priorities line after a model call', () => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: { value: 1, entityIds: ['host:a'] } } }),
      spaceId: 'default',
      entities: hostA,
      verified: { priorities: [], droppedPriorityCount: 2 },
    });
    expect(brief).toContain(`**Priorities**\n${NO_PRIORITIES_LINE}`);
    expect(brief).not.toContain('**What needs attention**');
  });

  it.each<[string, Partial<CandidateEntities>, string]>([
    [
      'the query narrowing',
      { hasPageQuery: true },
      '_Headline counts follow the period and entity filters, as on the page. The search query narrows the priorities._',
    ],
    [
      'a query that could not be applied',
      { hasPageQuery: true, pageQueryFailed: true },
      "_The search query or filters couldn't be applied, so they don't narrow the priorities._",
    ],
  ])('discloses %s', (_name, entities, disclosure) => {
    const brief = renderBrief({
      scope: scopeWith({ query: { query: 'host.name: web*', language: 'kuery' } }),
      spaceId: 'default',
      entities: { ...noEntities, ...entities },
    });
    expect(brief).toContain(disclosure);
    expect(brief).toContain('search "host.name: web\\*"');
  });
});
