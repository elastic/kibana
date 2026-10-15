/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { CandidateEntities } from './read_entities';
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
  identityCount: 0,
  isTruncated: false,
  capturedCount: 0,
  notFoundCount: 0,
  matchedCount: 0,
  hasPageQuery: false,
};

const hostA: CandidateEntities = {
  ...noEntities,
  candidates: [{ id: 'host:a', name: 'web_01', type: 'host', tileIds: ['riskMovers'], record: {} }],
  identityCount: 1,
  capturedCount: 1,
  matchedCount: 1,
};

const priority = (entityId: string, observed: string) => ({
  entityId,
  observed,
  whyItMatters: 'High impact asset.',
  nextStep: 'Review its alerts',
  factIds: [1],
});

describe('renderBrief', () => {
  it('renders the quiet case with the period only, and no priorities', () => {
    const brief = renderBrief({
      scope: scopeWith({
        tiles: { riskMovers: { title: 'Risk movers', value: 0, delta: 0, entityIds: [] } },
      }),
      spaceId: 'default',
      entities: noEntities,
    });
    expect(brief).toBe(`**Scope:** Last 7 days\n\n**What needs attention**\n${QUIET_LINE}`);
  });

  it('states every filter in the scope as the page labels it', () => {
    const brief = renderBrief({
      scope: scopeWith({
        entityFilters: {
          riskLevels: ['High'],
          assetCriticality: ['extreme_impact'],
          watchlists: ['id-1', 'id-2'],
        },
        query: { query: 'host.name: web*', language: 'kuery' },
      }),
      spaceId: 'soc',
      entities: noEntities,
    });
    expect(brief).toContain(
      '**Scope:** Last 7 days · Risk level: High · Asset criticality: Extreme impact · On 2 selected watchlists · Search "host.name: web\\*" · Space soc'
    );
  });

  it.each<[string, EntityAnalyticsScope['tiles'], Partial<CandidateEntities>, string]>([
    [
      'calls a fully read view with nothing flagged quiet',
      {
        riskMovers: { title: 'Risk movers', value: 0, entityIds: [] },
        newEntity: { title: 'New entity', value: 0, entityIds: [] },
      },
      {},
      QUIET_LINE,
    ],
    [
      'never calls a view quiet when data could not be read',
      { riskMovers: { title: 'Risk movers', value: 0, unavailable: true, entityIds: [] } },
      {},
      UNAVAILABLE_TILES_LINE,
    ],
    [
      'does not call a view quiet when flagged entities were not checked',
      { riskMovers: { title: 'Risk movers', value: 2, entityIds: ['host:x'] } },
      { capturedCount: 1, notFoundCount: 1 },
      NO_PRIORITIES_LINE,
    ],
    [
      'blames the search when it matches no flagged entity',
      { riskMovers: { title: 'Risk movers', value: 3, entityIds: ['host:x', 'host:y', 'host:z'] } },
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

  it.each<[string, EntityAnalyticsScope['tiles'], Partial<CandidateEntities>, string | undefined]>([
    [
      'no note when every flagged entity was checked',
      { riskMovers: { title: 'Risk movers', value: 1, entityIds: ['host:a'] } },
      {},
      undefined,
    ],
    [
      'no note when aliases fold into fewer identities',
      { newEntity: { title: 'New entity', value: 1, entityIds: ['host:a', 'host:a-alias'] } },
      { capturedCount: 2 },
      undefined,
    ],
    [
      'a cap left entities out',
      {
        riskMovers: {
          title: 'Risk movers',
          value: 30,
          entityIds: Array.from({ length: 30 }, (_, i) => `host:${i}`),
        },
      },
      { identityCount: 30, isTruncated: true },
      '_Based on the 1 highest-ranked of 30 flagged entities._',
    ],
    [
      'the page sent a sample of a large count, never summing counts',
      {
        entitiesWithAlerts: {
          title: 'Entities with alerts',
          value: 48213,
          entityIds: ['host:a', 'host:b'],
        },
        riskMovers: { title: 'Risk movers', value: 20, entityIds: ['host:a'] },
      },
      {},
      '_Based on the 1 highest-ranked of at least 48,213 flagged entities._',
    ],
  ])('sample note: %s', (_name, tiles, entities, note) => {
    const brief = renderBrief({
      scope: scopeWith({ tiles }),
      spaceId: 'default',
      entities: { ...hostA, ...entities },
    });
    if (note) {
      expect(brief).toContain(note);
    } else {
      expect(brief).not.toContain('Based on');
    }
  });

  it.each<[string, EntityAnalyticsScope['focusTileId'], EntityAnalyticsScope['tiles'], string[]]>([
    [
      'lists the counts in the page order, never summed',
      undefined,
      {
        entitiesWithAlerts: {
          title: 'Entities with alerts',
          value: 48213,
          delta: 4800,
          entityIds: [],
        },
        newlyHighCritical: { title: 'Newly high/critical', value: 3, delta: 3, entityIds: [] },
        riskMovers: { title: 'Risk movers', value: 6, delta: -2, entityIds: [] },
      },
      [
        '| Entities with alerts | 48,213 | +4,800 |',
        '| Risk movers | 6 | -2 |',
        '| Newly high/critical | 3 | +3 |',
      ],
    ],
    [
      'keeps the page order, even with a selected count, and leaves out rows with nothing to say',
      'watchlisted',
      {
        entitiesWithAlerts: { title: 'Entities with alerts', value: 130, delta: 30, entityIds: [] },
        riskMovers: { title: 'Risk movers', value: 0, unavailable: true, delta: 4, entityIds: [] },
        newlyHighCritical: { title: 'Newly high/critical', value: 0, delta: 0, entityIds: [] },
        newEntity: { title: 'New entity', value: 7, entityIds: [] },
        watchlisted: { title: 'Watchlisted', value: 3, delta: 0, entityIds: [] },
      },
      [
        '| Entities with alerts | 130 | +30 |',
        '| Watchlisted | 3 | no change |',
        '| New entity | 7 | not enough history |',
      ],
    ],
    [
      'leaves out the change column when nothing can be compared',
      undefined,
      {
        entitiesWithAlerts: { title: 'Entities with alerts', value: 5, entityIds: [] },
        newEntity: { title: 'New entity', value: 4, entityIds: [] },
      },
      ['| Entities with alerts | 5 |', '| New entity | 4 |'],
    ],
    [
      'hides the section when no row has anything to say',
      undefined,
      {
        entitiesWithAnomalies: { title: 'Entities with anomalies', value: 0, entityIds: [] },
        riskMovers: { title: 'Risk movers', value: 0, delta: 0, entityIds: [] },
        watchlisted: { title: 'Watchlisted', value: 4, unavailable: true, entityIds: [] },
      },
      [],
    ],
  ])('at a glance %s', (_name, focusTileId, tiles, rows) => {
    const brief = renderBrief({
      scope: scopeWith({ focusTileId, tiles }),
      spaceId: 'default',
      entities: noEntities,
    });
    if (rows.length === 0) {
      expect(brief).not.toContain('**This period at a glance**');
      return;
    }
    expect(brief).toContain(`|\n${rows.join('\n')}\n\n`);
  });

  it('puts the table under Priorities, the chart under its priority and the recommendation last', () => {
    const entities: CandidateEntities = {
      ...hostA,
      candidates: [
        ...hostA.candidates,
        { id: 'user:b', name: 'jdoe', type: 'user', tileIds: ['riskMovers'], record: {} },
      ],
    };
    const brief = renderBrief({
      scope: scopeWith({
        tiles: { riskMovers: { title: 'Risk movers', value: 2, entityIds: ['host:a', 'user:b'] } },
      }),
      spaceId: 'default',
      entities,
      verified: {
        attention: '{{ entity.id host:a }} rose sharply',
        priorities: [priority('host:a', 'Risk rose'), priority('user:b', 'Alerted')],
        recommendation: 'Start with {{ entity.id user:b }}.',
        droppedPriorityCount: 0,
      },
      entityTableTag: '<render_attachment id="x" version="1" />',
      riskChart: {
        tag: '<render_attachment id="y" version="1" />',
        entityId: 'user:b',
        of: 'resolution group',
      },
    });
    expect(brief).toContain(`**Priorities**

_The priority entities at a glance, with their current risk score and asset criticality from the Entity Store:_

<render_attachment id="x" version="1" />

1. **web\\_01**: Risk rose. High impact asset. _Next:_ Review its alerts.
2. **jdoe**: Alerted. High impact asset. _Next:_ Review its alerts.

_Risk history over the period for_ **jdoe** (resolution group)

<render_attachment id="y" version="1" />

**Recommended next step**
Start with **jdoe**.`);
  });

  it('escapes markdown in model text, so it adds no links, tags or emphasis', () => {
    const brief = renderBrief({
      scope: scopeWith({
        tiles: { riskMovers: { title: 'Risk movers', value: 1, entityIds: ['host:a'] } },
      }),
      spaceId: 'default',
      entities: hostA,
      verified: {
        attention:
          '{{ entity.id host:a }} see [runbook](https://x.test) ![i](https://y.test) <b> www.z.test ops@corp.test extreme_impact *now*',
        priorities: [],
        droppedPriorityCount: 0,
      },
    });
    expect(brief).toContain(
      '**web\\_01** see \\[runbook\\](https&#58;//x.test) \\!\\[i\\](https&#58;//y.test) \\<b\\> www\\.z.test ops&#64;corp.test extreme\\_impact \\*now\\*'
    );
  });

  it('renders the no-priorities line after a model call', () => {
    const brief = renderBrief({
      scope: scopeWith({
        tiles: { riskMovers: { title: 'Risk movers', value: 1, entityIds: ['host:a'] } },
      }),
      spaceId: 'default',
      entities: hostA,
      verified: { priorities: [], droppedPriorityCount: 2 },
    });
    expect(brief).toContain(`**Priorities**\n${NO_PRIORITIES_LINE}`);
    expect(brief).not.toContain('**What needs attention**');
  });

  it.each<[string, Partial<CandidateEntities>, string]>([
    [
      'a query that matches no flagged entity',
      { hasPageQuery: true, capturedCount: 1200, notFoundCount: 2 },
      '_None of the flagged entities match the search query._',
    ],
  ])('discloses %s', (_name, entities, disclosure) => {
    const brief = renderBrief({
      scope: scopeWith({ query: { query: 'host.name: web*', language: 'kuery' } }),
      spaceId: 'default',
      entities: { ...noEntities, ...entities },
    });
    expect(brief).toContain(disclosure);
  });
});
