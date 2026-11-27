/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiAgentContextFieldPath } from '@kbn/entity-store/common/domain/definitions/ai_agent_context';
import { getAiAgentActivityFieldPath } from '@kbn/entity-store/common/domain/definitions/ai_agent_activity';
import {
  toAgentActivityProfile,
  toAgentRow,
  toAgentStoreContext,
  toInventoryPerson,
} from './parse_rows';
import { ENTITY_ROW_COLUMNS } from './agent_queries';

const entityId = 'ai_agent:claude_code@host-1@ec2-user';

const contextColumns = {
  [getAiAgentContextFieldPath('person_watchlists')]: ['departing-employees'],
  [getAiAgentContextFieldPath('person_criticality')]: null,
  [getAiAgentContextFieldPath('person_mfa_enabled')]: false,
  [getAiAgentContextFieldPath('host_criticality')]: 'high_impact',
  [getAiAgentContextFieldPath('shared_account_installs')]: 2,
  [getAiAgentContextFieldPath('computed_at')]: '2026-11-26T23:35:19.675Z',
};

describe('toAgentStoreContext', () => {
  it('reads the facts the context maintainer wrote, leaving cleared values out', () => {
    expect(toAgentStoreContext(contextColumns)).toEqual({
      personWatchlistIds: ['departing-employees'],
      personCriticality: undefined,
      personMfaEnabled: false,
      hostCriticality: 'high_impact',
      sharedAccountInstalls: 2,
      computedAt: '2026-11-26T23:35:19.675Z',
    });
  });

  it('reads a single watchlist ID, which ES|QL returns as a string', () => {
    expect(
      toAgentStoreContext({
        ...contextColumns,
        [getAiAgentContextFieldPath('person_watchlists')]: 'privileged-users',
      })?.personWatchlistIds
    ).toEqual(['privileged-users']);
  });

  it('is undefined before the maintainer has run', () => {
    expect(
      toAgentStoreContext({
        ...contextColumns,
        [getAiAgentContextFieldPath('computed_at')]: null,
      })
    ).toBeUndefined();
  });
});

const activityColumns = {
  [getAiAgentActivityFieldPath('sessions')]: 30,
  [getAiAgentActivityFieldPath('active_days')]: 29,
  [getAiAgentActivityFieldPath('unattended_sessions')]: 30,
  [getAiAgentActivityFieldPath('permission_bypass_sessions')]: 1,
  [getAiAgentActivityFieldPath('computed_at')]: '2026-11-27T10:00:00.000Z',
};

describe('toAgentActivityProfile', () => {
  it('reads the sessions the activity maintainer counted', () => {
    expect(toAgentActivityProfile(activityColumns)).toEqual({
      sessions: 30,
      activeDays: 29,
      unattendedSessions: 30,
      permissionBypassSessions: 1,
      computedAt: '2026-11-27T10:00:00.000Z',
    });
  });

  it('keeps 0 sessions, which means installed but idle', () => {
    expect(
      toAgentActivityProfile({
        ...activityColumns,
        [getAiAgentActivityFieldPath('sessions')]: 0,
        [getAiAgentActivityFieldPath('active_days')]: 0,
        [getAiAgentActivityFieldPath('unattended_sessions')]: 0,
      })
    ).toEqual(expect.objectContaining({ sessions: 0, activeDays: 0, unattendedSessions: 0 }));
  });

  it('is undefined before the maintainer has run, so the table shows no value rather than 0', () => {
    const unmapped = Object.fromEntries(Object.keys(activityColumns).map((key) => [key, null]));
    expect(toAgentActivityProfile(unmapped)).toBeUndefined();
    expect(toAgentActivityProfile({})).toBeUndefined();
    expect(
      toAgentActivityProfile({
        ...activityColumns,
        [getAiAgentActivityFieldPath('sessions')]: null,
      })
    ).toBeUndefined();
  });
});

describe('toAgentRow', () => {
  it("keeps the agent's own watchlists and its store context", () => {
    const row = toAgentRow({
      'entity.id': entityId,
      'entity.attributes.watchlists': 'agents-for-departing-employees',
      ...contextColumns,
    });
    expect(row?.watchlistIds).toEqual(['agents-for-departing-employees']);
    expect(row?.storeContext?.sharedAccountInstalls).toBe(2);
  });

  it('has no store context on a row the maintainer has not reached', () => {
    expect(toAgentRow({ 'entity.id': entityId })?.storeContext).toBeUndefined();
  });

  it('keeps the activity profile, or none before the activity maintainer has run', () => {
    expect(toAgentRow({ 'entity.id': entityId, ...activityColumns })?.activityProfile).toEqual(
      expect.objectContaining({ sessions: 30, unattendedSessions: 30 })
    );
    expect(toAgentRow({ 'entity.id': entityId })?.activityProfile).toBeUndefined();
  });
});

describe('toInventoryPerson', () => {
  it("names the person from user.full_name, then entity.name, and keeps the person's watchlists", () => {
    expect(
      toInventoryPerson({
        'entity.id': 'user:alex@okta',
        'entity.name': 'alex',
        'user.full_name': 'Alex Doe',
        'user.email': ['alex@example.com', 'alex.doe@example.com'],
        'entity.attributes.watchlists': 'departing-employees',
      })
    ).toEqual({
      entityId: 'user:alex@okta',
      name: 'Alex Doe',
      emails: ['alex@example.com', 'alex.doe@example.com'],
      watchlistIds: ['departing-employees'],
    });
    expect(toInventoryPerson({ 'entity.id': 'user:sam@okta', 'entity.name': 'sam' })?.name).toBe(
      'sam'
    );
  });

  it('skips a row with no ID', () => {
    expect(toInventoryPerson({ 'user.full_name': 'Alex Doe' })).toBeUndefined();
  });
});

describe('ENTITY_ROW_COLUMNS', () => {
  it('keeps every ai_agent_context field', () => {
    expect(ENTITY_ROW_COLUMNS).toEqual(expect.arrayContaining(Object.keys(contextColumns)));
  });

  it('keeps every ai_agent_activity field', () => {
    expect(ENTITY_ROW_COLUMNS).toEqual(expect.arrayContaining(Object.keys(activityColumns)));
  });
});
