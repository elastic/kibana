/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSignedInAccounts } from '../utils';
import { getHostGroups, getPersonGroups } from './agent_groups';
import { mockInventoryRow as row, mockPerson } from './test_utils';

const avery = mockPerson({
  entityId: 'user:avery@okta',
  name: 'Avery Quinn',
  emails: ['avery@example.com'],
  watchlistIds: ['departing'],
});
const sam = mockPerson({
  entityId: 'user:sam@entra',
  name: 'Sam Lee',
  emails: ['sam@example.com'],
});

describe('getSignedInAccounts', () => {
  const people = new Map([avery, sam].map((person) => [person.entityId, person]));

  it('pairs each email with the person whose row carries it, ignoring case, and keeps the rest as emails', () => {
    expect(
      getSignedInAccounts(
        {
          accountIds: ['user:avery@okta', 'user:sam@entra'],
          accountEmails: ['Avery@example.com', 'sam@example.com', 'kim@personal.example'],
        },
        people
      )
    ).toEqual([
      { person: avery, emails: ['Avery@example.com'] },
      { person: sam, emails: ['sam@example.com'] },
      { emails: ['kim@personal.example'] },
    ]);
  });

  it('pairs one unclaimed email with one unclaimed person, as the maintainer resolved it from that email', () => {
    expect(
      getSignedInAccounts(
        { accountIds: ['user:avery@okta'], accountEmails: ['a.quinn@example.com'] },
        people
      )
    ).toEqual([{ person: avery, emails: ['a.quinn@example.com'] }]);
  });

  it('falls back to the raw email when the person row is missing', () => {
    expect(
      getSignedInAccounts(
        { accountIds: ['user:gone@okta'], accountEmails: ['gone@example.com'] },
        people
      )
    ).toEqual([{ emails: ['gone@example.com'] }]);
  });
});

describe('getPersonGroups', () => {
  const rows = [
    row({
      entityId: 'avery-laptop',
      hostId: 'laptop',
      riskScore: 40,
      alertCount: 1,
      accounts: [{ person: avery, emails: ['avery@example.com'] }],
    }),
    row({
      entityId: 'shared-runner',
      hostId: 'runner',
      riskScore: 88,
      alertCount: 2,
      accounts: [
        { person: avery, emails: ['avery@example.com'] },
        { emails: ['kim@personal.example'] },
      ],
    }),
    row({ entityId: 'headless', hostId: 'runner' }),
  ];

  it('puts an install with two accounts in both groups and summarises each group', () => {
    const groups = getPersonGroups(rows);
    const averyGroup = groups.find((group) => group.key === 'person:user:avery@okta');
    expect(averyGroup).toMatchObject({
      kind: 'person',
      person: avery,
      hostCount: 2,
      maxRiskScore: 88,
      alertCount: 3,
    });
    expect(averyGroup?.rows.map(({ entityId }) => entityId)).toEqual([
      'avery-laptop',
      'shared-runner',
    ]);
    expect(groups.find((group) => group.key === 'email:kim@personal.example')).toMatchObject({
      kind: 'unmatched',
      email: 'kim@personal.example',
      rows: [expect.objectContaining({ entityId: 'shared-runner' })],
    });
  });

  it('groups installs with no account together, and orders groups by highest agent risk', () => {
    const groups = getPersonGroups(rows);
    expect(groups.map(({ kind }) => kind)).toEqual(['person', 'unmatched', 'noAccount']);
    expect(groups[2].rows.map(({ entityId }) => entityId)).toEqual(['headless']);
  });
});

describe('getHostGroups', () => {
  it('keys on the host ID, with its criticality, agent count and distinct people', () => {
    const groups = getHostGroups([
      row({
        entityId: 'a',
        hostId: 'runner',
        hostName: 'ci-runner',
        alertCount: 1,
        storeContext: {
          personWatchlistIds: [],
          hostCriticality: 'high_impact',
          computedAt: '2026-11-27T00:00:00.000Z',
        },
        accounts: [{ person: avery, emails: [] }, { emails: ['kim@personal.example'] }],
      }),
      row({
        entityId: 'b',
        hostId: 'runner',
        hostName: 'ci-runner',
        accounts: [
          { person: avery, emails: [] },
          { person: sam, emails: [] },
        ],
      }),
      row({ entityId: 'c', hostId: 'laptop', hostName: 'laptop' }),
    ]);
    expect(groups[0]).toMatchObject({
      kind: 'host',
      key: 'runner',
      hostName: 'ci-runner',
      criticality: 'high_impact',
      peopleCount: 3,
      alertCount: 1,
    });
    expect(groups[0].rows).toHaveLength(2);
    expect(groups[1]).toMatchObject({ key: 'laptop', peopleCount: 0, criticality: undefined });
  });
});
