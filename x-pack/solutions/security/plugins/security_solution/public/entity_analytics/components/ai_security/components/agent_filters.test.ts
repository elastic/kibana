/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WatchlistLookup } from '../hooks/use_watchlist_lookup';
import type { AgentStoreContext } from '../types';
import {
  filterBySearch,
  getAgentRiskSortValue,
  getSessionsSortValue,
  matchesTile,
  type TileContext,
} from './agent_filters';
import {
  mockActivityProfile as activityProfile,
  mockInventoryRow as row,
  mockPerson,
} from './test_utils';

const context: TileContext = {
  unsanctionedWatchlistId: 'unsanctioned-ai-agents-watchlist-id-gen-demo',
  now: new Date('2026-11-27T12:00:00.000Z').getTime(),
};

const storeContext = (overrides: Partial<AgentStoreContext>): AgentStoreContext => ({
  personWatchlistIds: [],
  computedAt: '2026-11-27T00:00:00.000Z',
  ...overrides,
});

const lookup: WatchlistLookup = (ids) =>
  ids.map((id) => ({ id, name: id === 'departing' ? 'Departing employees' : id }));

describe('matchesTile', () => {
  it('finds installs on the Unsanctioned watchlist by its ID', () => {
    expect(
      matchesTile(
        'unsanctioned',
        row({ entityId: 'a', watchlistIds: [context.unsanctionedWatchlistId] }),
        context
      )
    ).toBe(true);
    expect(
      matchesTile(
        'unsanctioned',
        row({ entityId: 'b', watchlistIds: ['unsanctioned-ai-agents-watchlist-id-default'] }),
        context
      )
    ).toBe(false);
  });

  it('finds installs acting for people on watchlists', () => {
    expect(
      matchesTile(
        'personWatchlists',
        row({ entityId: 'a', storeContext: storeContext({ personWatchlistIds: ['departing'] }) }),
        context
      )
    ).toBe(true);
    expect(matchesTile('personWatchlists', row({ entityId: 'b' }), context)).toBe(false);
  });

  it('finds installs on high or extreme impact hosts', () => {
    const onHost = (hostCriticality: AgentStoreContext['hostCriticality']) =>
      matchesTile(
        'highImpactHosts',
        row({ entityId: 'a', storeContext: storeContext({ hostCriticality }) }),
        context
      );
    expect(onHost('high_impact')).toBe(true);
    expect(onHost('extreme_impact')).toBe(true);
    expect(onHost('medium_impact')).toBe(false);
    expect(onHost(undefined)).toBe(false);
  });

  it('finds installs first seen in the last 7 days', () => {
    expect(
      matchesTile(
        'newInstalls',
        row({ entityId: 'a', firstSeen: '2026-11-21T12:00:00.000Z' }),
        context
      )
    ).toBe(true);
    expect(
      matchesTile(
        'newInstalls',
        row({ entityId: 'b', firstSeen: '2026-11-19T12:00:00.000Z' }),
        context
      )
    ).toBe(false);
    expect(matchesTile('newInstalls', row({ entityId: 'c', firstSeen: undefined }), context)).toBe(
      false
    );
  });

  it('finds installs with a scheduled or scripted session, and not those the maintainer missed', () => {
    const unattended = (unattendedSessions: number | undefined, sessions = 5) =>
      matchesTile(
        'runsUnattended',
        row({ entityId: 'a', activityProfile: activityProfile({ sessions, unattendedSessions }) }),
        context
      );
    expect(unattended(30, 30)).toBe(true);
    expect(unattended(1)).toBe(true);
    expect(unattended(0)).toBe(false);
    expect(unattended(undefined)).toBe(false);
    expect(matchesTile('runsUnattended', row({ entityId: 'b', userName: 'root' }), context)).toBe(
      false
    );
  });
});

describe('getSessionsSortValue', () => {
  it('sorts an idle install above one the activity maintainer has not reached', () => {
    expect(getSessionsSortValue({ activityProfile: activityProfile({ sessions: 12 }) })).toBe(12);
    expect(getSessionsSortValue({ activityProfile: activityProfile({ sessions: 0 }) })).toBe(0);
    expect(getSessionsSortValue({ activityProfile: undefined })).toBe(-1);
  });
});

describe('getAgentRiskSortValue', () => {
  it('orders by score, then open alerts, then last seen, with no score below a score of 0', () => {
    const values = [
      getAgentRiskSortValue({ riskScore: 55.5, alertCount: 0, lastSeen: undefined }),
      getAgentRiskSortValue({ riskScore: 0, alertCount: 0, lastSeen: undefined }),
      getAgentRiskSortValue({
        riskScore: undefined,
        alertCount: 4,
        lastSeen: '2026-01-01T00:00:00.000Z',
      }),
      getAgentRiskSortValue({
        riskScore: undefined,
        alertCount: 0,
        lastSeen: '2026-11-26T00:00:00.000Z',
      }),
      getAgentRiskSortValue({
        riskScore: undefined,
        alertCount: 0,
        lastSeen: '2026-11-20T00:00:00.000Z',
      }),
    ];
    expect([...values].sort().reverse()).toEqual(values);
  });
});

describe('filterBySearch', () => {
  const avery = mockPerson({
    entityId: 'user:avery@okta',
    name: 'Avery Quinn',
    emails: ['avery@example.com'],
  });
  const rows = [
    row({
      entityId: 'avery-install',
      accountEmails: ['aquinn@example.com'],
      accounts: [{ person: avery, emails: ['aquinn@example.com'] }],
    }),
    row({
      entityId: 'other',
      hostName: 'ci-build',
      watchlistIds: ['departing'],
      accounts: [{ emails: ['sam@example.com'] }],
    }),
  ];
  const ids = (query: string) => filterBySearch(rows, query, lookup).map((r) => r.entityId);

  it("matches the person's name and every email of the account", () => {
    expect(ids('avery')).toEqual(['avery-install']);
    expect(ids('Quinn')).toEqual(['avery-install']);
    expect(ids('aquinn@example.com')).toEqual(['avery-install']);
    expect(ids('sam@')).toEqual(['other']);
  });

  it('matches host and watchlist names, and needs every word', () => {
    expect(ids('departing')).toEqual(['other']);
    expect(ids('ci-build sam')).toEqual(['other']);
    expect(ids('ci-build avery')).toEqual([]);
    expect(ids('  ')).toEqual(['avery-install', 'other']);
  });
});
