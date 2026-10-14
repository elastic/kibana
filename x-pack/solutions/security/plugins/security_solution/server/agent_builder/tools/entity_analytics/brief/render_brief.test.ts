/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { CandidateEntities } from './fetch_candidate_entities';
import {
  NO_MATCH_LINE,
  NO_PRIORITIES_LINE,
  QUIET_LINE,
  UNAVAILABLE_TILES_LINE,
  renderBrief,
} from './render_brief';

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
      '**Scope:** last 7 days (2026-10-07 12:00 UTC to 2026-10-14 12:00 UTC) · space default · captured 2026-10-14 12:00 UTC · Entity Store last updated 2026-10-14 11:55 UTC'
    );
    expect(brief).toContain("_Checked: 0 entities in the page's tiles._");
  });

  it.each<[string, EntityAnalyticsScope['tiles'], Partial<CandidateEntities>, string]>([
    [
      'calls a fully read view with nothing flagged quiet',
      { riskMovers: { value: 0, entityIds: [] }, newEntity: { value: 0, entityIds: [] } },
      {},
      QUIET_LINE,
    ],
    [
      'never calls a view quiet when a tile could not be read',
      { riskMovers: { value: 0, unavailable: true, entityIds: [] } },
      {},
      UNAVAILABLE_TILES_LINE,
    ],
    [
      'does not call a view quiet when tiles flagged entities that were not checked',
      { riskMovers: { value: 2, entityIds: ['host:x'] } },
      { capturedCount: 1, notFoundCount: 1 },
      NO_PRIORITIES_LINE,
    ],
    [
      'blames the search when it matches no tile entity',
      { riskMovers: { value: 3, entityIds: ['host:x', 'host:y', 'host:z'] } },
      { capturedCount: 3, hasPageQuery: true },
      NO_MATCH_LINE,
    ],
  ])('%s', (_name, tiles, entities, line) => {
    const brief = renderBrief({
      scope: scopeWith({ tiles }),
      spaceId: 'default',
      entities: { ...noEntities, ...entities },
    });
    expect(brief).toContain(`**What needs attention**\n${line}`);
  });

  it.each<[string, EntityAnalyticsScope['tiles'], Partial<CandidateEntities>, string]>([
    [
      'all tile entities',
      { riskMovers: { value: 1, entityIds: ['host:a'] } },
      hostA,
      "_Checked: 1 entity in the page's tiles._",
    ],
    [
      'a ranked cut of the tile entities',
      { riskMovers: { value: 30, entityIds: Array.from({ length: 30 }, (_, i) => `host:${i}`) } },
      { ...hostA, capturedCount: 30, matchedCount: 30 },
      "_Checked: 1 of 30 entities in the page's tiles, chosen by selected tile, tile count, then risk._",
    ],
    [
      'a sample of a large tile, never summing tiles',
      {
        entitiesWithAlerts: { value: 48213, entityIds: ['host:a', 'host:b'] },
        riskMovers: { value: 20, entityIds: ['host:a'] },
      },
      { ...hostA, capturedCount: 2, matchedCount: 2 },
      "_Checked: 1 of at least 48,213 entities in the page's tiles, chosen by selected tile, tile count, then risk._",
    ],
  ])('states the coverage of %s', (_name, tiles, entities, coverage) => {
    const brief = renderBrief({
      scope: scopeWith({ tiles }),
      spaceId: 'default',
      entities: { ...noEntities, ...entities },
    });
    expect(brief).toContain(coverage);
  });

  it.each<[string, EntityAnalyticsScope['focusTileId'], EntityAnalyticsScope['tiles'], string[]]>([
    [
      'ranks by relative change, then rises from zero, and never sums',
      undefined,
      {
        entitiesWithAlerts: { value: 48213, delta: 4800, entityIds: [] },
        newlyHighCritical: { value: 3, delta: 3, entityIds: [] },
        riskMovers: { value: 6, delta: -2, entityIds: [] },
      },
      [
        '| Risk movers | 6 | -2 vs previous 7 days |',
        '| Entities with alerts | 48,213 | +4,800 vs previous 7 days |',
        '| Newly high/critical | 3 | none in the previous 7 days |',
      ],
    ],
    [
      'puts the selected tile first and floors small bases',
      'newEntity',
      {
        entitiesWithAlerts: { value: 130, delta: 30, entityIds: [] },
        riskMovers: { value: 0, unavailable: true, entityIds: [] },
        watchlisted: { value: 3, delta: 1, entityIds: [] },
        newEntity: { value: 7, entityIds: [] },
      },
      [
        '| New entity | 7 | no comparison |',
        '| Entities with alerts | 130 | +30 vs previous 7 days |',
        '| Watchlisted | 3 | +1 vs previous 7 days |',
      ],
    ],
    [
      'hides the section when no tile has a comparison',
      undefined,
      {
        entitiesWithAlerts: { value: 10, entityIds: [] },
        riskMovers: { value: 0, unavailable: true, delta: 4, entityIds: [] },
      },
      [],
    ],
  ])('what changed %s', (_name, focusTileId, tiles, rows) => {
    const brief = renderBrief({
      scope: scopeWith({ focusTileId, tiles }),
      spaceId: 'default',
      entities: noEntities,
    });
    if (rows.length === 0) {
      expect(brief).not.toContain('**What changed**');
      return;
    }
    expect(brief).toContain(`| --- | --- | --- |\n${rows.join('\n')}\n\n`);
  });

  it.each([
    [
      'no change',
      { value: 1, delta: 0, entityIds: [] },
      '| Risk movers | 1 | no change vs previous 7 days |',
    ],
    ['no comparison', { value: 1, entityIds: [] }, '| Risk movers | 1 | no comparison |'],
    [
      'unavailable',
      { value: 0, unavailable: true as const, entityIds: [] },
      '| Risk movers | unavailable | unavailable |',
    ],
  ])('renders %s', (_name, tile, row) => {
    const brief = renderBrief({
      scope: scopeWith({
        tiles: { riskMovers: tile, entitiesWithAlerts: { value: 4, delta: 1, entityIds: [] } },
      }),
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

  it('escapes link, image and tag syntax and breaks autolinks in model text', () => {
    const brief = renderBrief({
      scope: scopeWith({ tiles: { riskMovers: { value: 1, entityIds: ['host:a'] } } }),
      spaceId: 'default',
      entities: hostA,
      verified: {
        attention:
          '{{ entity.id host:a }} see [runbook](https://x.test) ![i](https://y.test) <b> www.z.test ops@corp.test',
        priorities: [],
        droppedPriorityCount: 0,
      },
    });
    expect(brief).toContain(
      '**web\\_01** see \\[runbook\\](https&#58;//x.test) \\!\\[i\\](https&#58;//y.test) \\<b\\> www\\.z.test ops&#64;corp.test'
    );
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
    [
      'a query that matches no tile entity',
      { hasPageQuery: true, capturedCount: 1200, notFoundCount: 2 },
      '_None of the 1,198 tile entities match the search query._',
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
