/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AgentPerson,
  AgentStoreContext,
  RelatedEntity,
} from '../../../../../entity_analytics/components/ai_security/types';
import { formatPersonStatus, getMfaEnabled, getPersonSignals } from './person_signals';

const person = (overrides: Partial<AgentPerson> = {}): AgentPerson => ({
  email: 'avery.quinn@example.com',
  rows: [],
  watchlistIds: [],
  ...overrides,
});

const userRow = (mfaEnabled: boolean, source = 'okta'): RelatedEntity => ({
  entityId: `user:avery.quinn@example.com@${source}`,
  engineType: 'user',
  email: 'avery.quinn@example.com',
  mfaEnabled,
  watchlistIds: [],
  resolvedTo: [],
  accountEmails: [],
  accountIds: [],
  ownsInferredIds: [],
});

const rowFacts: AgentStoreContext = {
  personWatchlistIds: ['privileged-users'],
  personMfaEnabled: true,
  computedAt: '2026-11-26T10:00:00.000Z',
};

describe('getPersonSignals', () => {
  it('gives nothing for a healthy or unknown person', () => {
    expect(getPersonSignals(person())).toEqual([]);
    expect(getPersonSignals(person({ rows: [userRow(true)] }))).toEqual([]);
  });

  it('lists watchlists, then MFA off', () => {
    expect(
      getPersonSignals(person({ watchlistIds: ['departing-employees'], rows: [userRow(false)] }))
    ).toEqual([{ kind: 'watchlist', watchlistId: 'departing-employees' }, { kind: 'mfa_off' }]);
  });

  it("prefers the agent row's watchlists and MFA when it speaks for this person", () => {
    const signals = getPersonSignals(
      person({
        watchlistIds: ['departing-employees'],
        rows: [userRow(false)],
      }),
      rowFacts
    );
    expect(signals).toEqual([{ kind: 'watchlist', watchlistId: 'privileged-users' }]);
  });
});

describe('getMfaEnabled', () => {
  it('is off when any row reports off, and unknown when none reports', () => {
    expect(getMfaEnabled(person())).toBeUndefined();
    expect(getMfaEnabled(person({ rows: [userRow(true)] }))).toBe(true);
    expect(getMfaEnabled(person({ rows: [userRow(true), userRow(false, 'entra_id')] }))).toBe(
      false
    );
  });
});

describe('formatPersonStatus', () => {
  it('turns the signals into short phrases, leaving watchlists out', () => {
    expect(
      formatPersonStatus([
        { kind: 'watchlist', watchlistId: 'departing-employees' },
        { kind: 'mfa_off' },
      ])
    ).toEqual(['MFA off']);
  });

  it('gives nothing when only watchlists are set', () => {
    expect(formatPersonStatus([{ kind: 'watchlist', watchlistId: 'departing-employees' }])).toEqual(
      []
    );
  });
});
