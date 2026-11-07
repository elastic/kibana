/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { of, throwError } from 'rxjs';
import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { EntityType } from '../../../../common/entity_analytics/types';
import type { IntelligenceEntity } from './common';
import type { SecurityFinding, SecuritySearchResponse } from './security_findings/types';
import {
  entityRiskAlertAlias,
  resolveEntityRiskInputReferences,
  useEntityAgentRiskInputs,
} from './use_entity_agent_risk_inputs';

const mockSearch = jest.fn();
jest.mock('../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { data: { search: { search: mockSearch } } } }),
}));
const alias = '.alerts-security.alerts-default';
const hit = {
  _index: '.internal.alerts-security.alerts-default-000008',
  _id: 'alert-1',
  _source: { 'kibana.space_ids': ['default'] },
};
const response: SecuritySearchResponse = {
  _shards: { total: 1, failed: 0 },
  hits: { total: { value: 1, relation: 'eq' }, hits: [hit] },
};
const entity: IntelligenceEntity = {
  id: 'user:subject',
  name: 'Requester',
  type: EntityType.user,
  identifierValue: 'requester@example.com',
  riskLevel: 'Moderate',
  riskScoreNorm: 57,
  criticality: undefined,
  lastSeen: undefined,
  source: undefined,
};
const finding: SecurityFinding = {
  id: hit._id,
  source: { id: hit._id, index: hit._index },
  timestamp: '2026-10-14T12:00:00Z',
  title: 'Agent lookup',
  severity: 'high',
  status: 'open',
  kind: 'detection',
  outcome: 'unknown',
  rule: { name: 'Policy match' },
  ancestors: [],
  entityIds: [],
  agent: { id: 'agent', provider: 'google_adk' },
  policy: { id: 'policy', name: 'Policy', mode: 'monitor', decision: 'deny', engine: 'monitor' },
};
const history: RiskScoreHistoryResponse = {
  entity_id: entity.id,
  entity_type: 'user',
  interval: '3h',
  entries: [
    {
      '@timestamp': '2026-10-14T13:00:00Z',
      calculated_level: 'Moderate',
      calculated_score_norm: 57,
      inputs: [{ id: hit._id, index: alias, category: 'category_1', description: 'Agent lookup' }],
    },
  ],
};
const makeWrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
    logger: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return Wrapper;
};
beforeEach(() => {
  jest.clearAllMocks();
  mockSearch.mockReturnValue(of({ rawResponse: response }));
});

it('resolves the exact alias to the backing document returned by Elasticsearch', () => {
  expect(resolveEntityRiskInputReferences(alias, 'default', [hit._id], response)).toEqual({
    alias,
    complete: true,
    references: [{ id: hit._id, index: hit._index }],
  });
});

it.each(['duplicate', 'partial', 'shards', 'timeout', 'space', 'missing'])(
  'fails closed on %s evidence',
  (kind) => {
    let changed = response;
    if (kind === 'duplicate')
      changed = {
        ...response,
        hits: { total: 2, hits: [hit, { ...hit, _index: 'other-backing-index' }] },
      };
    if (kind === 'partial') changed = { ...response, hits: { ...response.hits, total: 5 } };
    if (kind === 'shards') changed = { ...response, _shards: { total: 2, failed: 1 } };
    if (kind === 'timeout') changed = { ...response, timed_out: true };
    if (kind === 'space')
      changed = {
        ...response,
        hits: {
          ...response.hits,
          hits: [{ ...hit, _source: { 'kibana.space_ids': ['other-space'] } }],
        },
      };
    if (kind === 'missing') changed = { ...response, hits: { total: 0, hits: [] } };
    expect(resolveEntityRiskInputReferences(alias, 'default', [hit._id], changed).complete).toBe(
      false
    );
  }
);

it('queries only the exact current-space alert alias and shared IDs', async () => {
  const { result } = renderHook(
    () => useEntityAgentRiskInputs(entity, [finding], history, 'default'),
    { wrapper: makeWrapper() }
  );
  await waitFor(() => expect(result.current.complete).toBe(true));
  expect(result.current.references).toEqual([{ id: hit._id, index: hit._index }]);
  expect(mockSearch).toHaveBeenCalledWith(
    {
      params: expect.objectContaining({
        index: alias,
        size: 200,
        _source: ['kibana.space_ids'],
        query: {
          bool: {
            filter: [{ ids: { values: [hit._id] } }, { term: { 'kibana.space_ids': 'default' } }],
          },
        },
      }),
    },
    { abortSignal: expect.any(AbortSignal) }
  );
});

it('does not search a foreign risk alias, invalid space, or history for another entity', () => {
  expect(entityRiskAlertAlias('default,*')).toBeUndefined();
  const { result } = renderHook(
    () =>
      useEntityAgentRiskInputs(entity, [finding], { ...history, entity_id: 'other' }, 'default'),
    { wrapper: makeWrapper() }
  );
  expect(result.current.references).toEqual([]);
  expect(mockSearch).not.toHaveBeenCalled();
});

it('does not retain resolved references after a failed search', async () => {
  mockSearch.mockReturnValue(throwError(() => new Error('Denied')));
  const { result } = renderHook(
    () => useEntityAgentRiskInputs(entity, [finding], history, 'default'),
    { wrapper: makeWrapper() }
  );
  await waitFor(() => expect(mockSearch).toHaveBeenCalled());
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current.complete).toBe(false);
  expect(result.current.references).toEqual([]);
});
