/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import type { Entity } from '../../../../../common/api/entity_analytics';
import type { GoogleAdkContext } from '../../../../../common/entity_intelligence/google_adk';
import { useGoogleRequesterEntity } from './use_google_requester_entity';

const mockFetchEntities = jest.fn();
let mockEnabled = false;
let mockQuery: (input: { signal?: AbortSignal }) => Promise<{ records: Entity[]; total: number }>;
let mockResult: {
  data?: { records: Entity[]; total: number };
  isError: boolean;
  isLoading: boolean;
};
jest.mock('@kbn/react-query', () => ({
  useQuery: (_key: object, query: typeof mockQuery, options: { enabled: boolean }) => {
    mockQuery = query;
    mockEnabled = options.enabled;
    return { ...mockResult, refetch: jest.fn() };
  },
}));
jest.mock('../../../api/api', () => ({
  useEntityAnalyticsRoutes: () => ({ fetchEntitiesListV2: mockFetchEntities }),
}));
jest.mock('../../../../common/hooks/use_space_id', () => ({ useSpaceId: () => 'space-one' }));

const requester: GoogleAdkContext['requester'] = {
  subject: 'verified-subject',
  email: 'person@example.com',
  authenticated: true,
  principal_type: 'google_account',
  provenance: 'google_signed_id_token_verified_by_application',
  human_identity: 'account_level_only',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockResult = { isError: false, isLoading: false };
});

it('bounds lookup to an exact subject and name and does not query a local or service owner', async () => {
  const { rerender } = renderHook(
    ({ actor }: { actor?: GoogleAdkContext['requester'] }) => useGoogleRequesterEntity(actor),
    { initialProps: { actor: requester } }
  );
  expect(mockEnabled).toBe(true);
  await mockQuery({});
  expect(mockFetchEntities).toHaveBeenCalledWith({
    signal: undefined,
    params: {
      entityTypes: ['user'],
      page: 1,
      perPage: 2,
      filterQuery: JSON.stringify({
        bool: {
          filter: [
            { term: { 'user.id': 'verified-subject' } },
            { term: { 'user.name': 'person@example.com' } },
          ],
        },
      }),
    },
  });
  rerender({ actor: undefined });
  expect(mockEnabled).toBe(false);
  rerender({ actor: { ...requester, principal_type: 'service_account' } });
  expect(mockEnabled).toBe(false);
});

it('hides cached matches after an access failure', () => {
  mockResult = {
    isError: true,
    isLoading: false,
    data: {
      total: 1,
      records: [
        {
          user: { id: requester.subject, name: requester.email },
          entity: { id: 'canonical-id', EngineMetadata: { Type: 'user' } },
        } as Entity,
      ],
    },
  };
  const { result } = renderHook(() => useGoogleRequesterEntity(requester));
  expect(result.current.entity).toBeUndefined();
  expect(result.current.unavailable).toBe(true);
});
