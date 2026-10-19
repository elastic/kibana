/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityAnalyticsScope } from '../../../../../common/entity_analytics/ai_brief/scope';
import type { BriefPriority } from './prompts';
import type { EntityFacts } from './types';
import type { CandidateEntities } from './read_entities';
import { NO_PRIORITIES_LINE, QUIET_LINE, getRiskChartEntityId, renderBrief } from './render_brief';

const scopeWith = (overrides: Partial<EntityAnalyticsScope>): EntityAnalyticsScope => ({
  period: '7d',
  capturedAt: '2026-10-14T12:00:00.000Z',
  tiles: {},
  ...overrides,
});

const noEntities: CandidateEntities = {
  candidates: [],
  isTruncated: false,
  capturedCount: 0,
  notFoundCount: 0,
  matchedCount: 0,
  hasPageQuery: false,
};

const hostA: CandidateEntities = {
  ...noEntities,
  candidates: [{ id: 'host:a', name: 'web_01', type: 'host', tileIds: ['riskMovers'], record: {} }],
  capturedCount: 1,
  matchedCount: 1,
};

const priority = (entityId: string, observed = 'Observed.'): BriefPriority => ({
  entityId,
  observed,
  whyItMatters: 'High impact asset.',
  nextStep: 'Review its alerts',
});

describe('renderBrief', () => {
  it('renders a full brief: scope, notes, counts, priorities with table and chart, recommendation', () => {
    const brief = renderBrief({
      scope: scopeWith({
        entityFilters: { riskLevels: ['High'], watchlists: ['id-1', 'id-2'] },
        query: { query: 'host.name: web*', language: 'kuery' },
        focusTileId: 'watchlisted',
        tiles: {
          entitiesWithAlerts: {
            title: 'Entities with alerts',
            value: 48213,
            delta: 4800,
            entityIds: ['host:a', 'user:b'],
          },
          entitiesWithAnomalies: {
            title: 'Entities with anomalies',
            value: 0,
            unavailable: true,
            entityIds: [],
          },
          riskMovers: { title: 'Risk movers', value: 6, delta: -2, entityIds: ['host:a'] },
          newlyHighCritical: { title: 'Newly high/critical', value: 0, delta: 0, entityIds: [] },
          watchlisted: { title: 'Watchlisted', value: 3, delta: 0, entityIds: ['user:b'] },
          newEntity: { title: 'New entity', value: 7, entityIds: [] },
        },
      }),
      spaceId: 'soc',
      entities: {
        ...hostA,
        candidates: [
          ...hostA.candidates,
          { id: 'user:b', name: 'jdoe', type: 'user', tileIds: ['watchlisted'], record: {} },
        ],
        capturedCount: 3,
        notFoundCount: 1,
        matchedCount: 2,
        hasPageQuery: true,
      },
      verified: {
        summary: '{{ entity.id host:a }} rose sharply.',
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
    expect(brief)
      .toBe(`**Scope:** Last 7 days · Risk level: High · On 2 selected watchlists · Search "host.name: web\\*" · Space soc
_1 flagged entity was not found in the Entity Store._
_Not checked, because the data couldn't be read: Entities with anomalies._

**What needs attention**
**web\\_01** rose sharply.

**This period at a glance**

|  | Entities | vs previous 7 days |
| --- | --- | --- |
| Entities with alerts | 48,213 | +4,800 |
| Risk movers | 6 | -2 |
| Watchlisted | 3 | no change |
| New entity | 7 | not enough history |

**Priorities**

_The priority entities at a glance, with their current risk score and asset criticality from the Entity Store:_

<render_attachment id="x" version="1" />

1. **web\\_01**: Risk rose. High impact asset. _Next:_ Review its alerts.
2. **jdoe**: Alerted. High impact asset. _Next:_ Review its alerts.

_Risk history over the period for_ **jdoe** (resolution group)

<render_attachment id="y" version="1" />

**Recommended next step**
Start with **jdoe**.

_Based on the 2 highest-ranked of at least 48,213 flagged entities._`);
  });

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

  it('has nothing to prioritize, and says why, when the search matches no flagged entity', () => {
    const brief = renderBrief({
      scope: scopeWith({
        query: { query: 'host.name: web*', language: 'kuery' },
        tiles: { riskMovers: { title: 'Risk movers', value: 3, entityIds: ['host:x', 'host:y'] } },
      }),
      spaceId: 'default',
      entities: { ...noEntities, capturedCount: 2, hasPageQuery: true },
    });
    expect(brief).toContain('_None of the flagged entities match the search query._');
    expect(brief).toContain(`**What needs attention**\n${NO_PRIORITIES_LINE}`);
  });

  it('escapes markdown in model text, so it adds no links, tags or emphasis', () => {
    const brief = renderBrief({
      scope: scopeWith({
        tiles: { riskMovers: { title: 'Risk movers', value: 1, entityIds: ['host:a'] } },
      }),
      spaceId: 'default',
      entities: hostA,
      verified: {
        summary:
          '{{ entity.id host:a }} see [runbook](https://x.test) ![i](https://y.test) <b> www.z.test ops@corp.test extreme_impact *now*',
        priorities: [],
        droppedPriorityCount: 0,
      },
    });
    expect(brief).toContain(
      '**web\\_01** see \\[runbook\\](https&#58;//x.test) \\!\\[i\\](https&#58;//y.test) \\<b\\> www\\.z.test ops&#64;corp.test extreme\\_impact \\*now\\*'
    );
  });
});

describe('getRiskChartEntityId', () => {
  it('picks the first priority a risk tile flags', () => {
    const facts = (entityId: string, flaggedFor: EntityFacts['flaggedFor']): EntityFacts => ({
      entityId,
      name: entityId,
      type: 'host',
      flaggedFor,
    });
    const all = [
      facts('host:alerted', ['entitiesWithAlerts']),
      facts('host:rose', ['entitiesWithAlerts', 'newlyHighCritical']),
      facts('host:moved', ['riskMovers']),
    ];

    expect(
      getRiskChartEntityId(
        [priority('host:alerted'), priority('host:rose'), priority('host:moved')],
        all
      )
    ).toBe('host:rose');
    expect(getRiskChartEntityId([priority('host:alerted')], all)).toBeUndefined();
  });
});
