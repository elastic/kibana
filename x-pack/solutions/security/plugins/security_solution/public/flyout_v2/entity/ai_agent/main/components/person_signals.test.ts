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
import { getMfaEnabled, getPersonSignals } from './person_signals';

const person = (overrides: Partial<AgentPerson> = {}): AgentPerson => ({
  email: 'avery.quinn@example.com',
  rows: [],
  idpAccounts: [],
  watchlistIds: [],
  ...overrides,
});

const userRow = (mfaEnabled: boolean): RelatedEntity => ({
  entityId: 'user:avery.quinn@example.com@okta',
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
    expect(
      getPersonSignals(
        person({
          idpAccounts: [
            {
              email: 'avery.quinn@example.com',
              provider: 'Entra ID',
              enabled: true,
              mfaEnabled: true,
              isMock: false,
            },
          ],
          hr: { email: 'avery.quinn@example.com', status: 'Active', isMock: false },
        })
      )
    ).toEqual([]);
  });

  it('lists watchlists, termination, deprovisioned or suspended accounts and MFA off, in that order', () => {
    expect(
      getPersonSignals(
        person({
          watchlistIds: ['departing-employees'],
          hr: {
            email: 'avery.quinn@example.com',
            status: 'Terminated',
            terminationDate: '2026-11-25',
            isMock: false,
          },
          idpAccounts: [
            {
              email: 'avery.quinn@example.com',
              provider: 'Okta',
              deprovisioned: true,
              mfaEnabled: false,
              isMock: false,
            },
            {
              email: 'avery.quinn@example.com',
              provider: 'Entra ID',
              suspended: true,
              isMock: false,
            },
          ],
        })
      )
    ).toEqual([
      { kind: 'watchlist', watchlistId: 'departing-employees' },
      { kind: 'terminated', date: '2026-11-25' },
      { kind: 'idp', provider: 'Okta', state: 'deprovisioned' },
      { kind: 'idp', provider: 'Entra ID', state: 'suspended' },
      { kind: 'mfa_off' },
    ]);
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
  it('is off when any source reports off, and unknown when none reports', () => {
    expect(getMfaEnabled(person())).toBeUndefined();
    expect(getMfaEnabled(person({ rows: [userRow(true)] }))).toBe(true);
    expect(
      getMfaEnabled(
        person({
          rows: [userRow(true)],
          idpAccounts: [
            {
              email: 'avery.quinn@example.com',
              provider: 'Okta',
              mfaEnabled: false,
              isMock: false,
            },
          ],
        })
      )
    ).toBe(false);
  });
});
