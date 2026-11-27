/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAiAgentContextFieldPath } from '@kbn/entity-store/common/domain/definitions/ai_agent_context';
import { toAgentRow, toAgentStoreContext } from './parse_rows';
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
});

describe('ENTITY_ROW_COLUMNS', () => {
  it('keeps every ai_agent_context field', () => {
    expect(ENTITY_ROW_COLUMNS).toEqual(expect.arrayContaining(Object.keys(contextColumns)));
  });
});
