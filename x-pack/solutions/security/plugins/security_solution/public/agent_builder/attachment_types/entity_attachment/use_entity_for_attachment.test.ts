/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import type { EntityAttachmentIdentifier } from './types';
import { useEntityForAttachment } from './use_entity_for_attachment';

const mockFetch = jest.fn();

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: () => ({ services: { http: { fetch: mockFetch } } }),
}));

const createWrapper = () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, cacheTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client }, children);
  Wrapper.displayName = 'TestQueryClientProvider';
  return Wrapper;
};

const parseLastFilterQuery = (): Record<string, unknown> => {
  expect(mockFetch).toHaveBeenCalled();
  const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
  const filterQuery = lastCall[1]?.query?.filterQuery as string | undefined;
  expect(typeof filterQuery).toBe('string');
  return JSON.parse(filterQuery!);
};

describe('useEntityForAttachment', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    // The hook returns `response?.records?.[0]`; giving it at least one
    // record keeps react-query from complaining about `data === undefined`
    // and mirrors the shape we care about in filter-query assertions.
    mockFetch.mockResolvedValue({ records: [{ entity: { id: 'stub' } }] });
  });

  it('filters by entity.id when the identifier carries entityStoreId', async () => {
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'user',
      identifier: "Lena Medhurst@Lena's MacBook Pro",
      entityStoreId: "user:Lena Medhurst@Lena's MacBook Pro@local",
    };

    renderHook(() => useEntityForAttachment(identifier), { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const parsed = parseLastFilterQuery();
    expect(parsed).toEqual({
      bool: {
        filter: [{ term: { 'entity.id': "user:Lena Medhurst@Lena's MacBook Pro@local" } }],
      },
    });
  });

  it('falls back to user.name for a legacy user identifier without entityStoreId', async () => {
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'user',
      identifier: 'bob',
    };

    renderHook(() => useEntityForAttachment(identifier), { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(parseLastFilterQuery()).toEqual({
      bool: { filter: [{ term: { 'user.name': 'bob' } }] },
    });
  });

  it('falls back to host.name for a legacy host identifier without entityStoreId', async () => {
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'host',
      identifier: 'server1',
    };

    renderHook(() => useEntityForAttachment(identifier), { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(parseLastFilterQuery()).toEqual({
      bool: { filter: [{ term: { 'host.name': 'server1' } }] },
    });
  });

  it('falls back to service.name for a legacy service identifier without entityStoreId', async () => {
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'service',
      identifier: 'payments',
    };

    renderHook(() => useEntityForAttachment(identifier), { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(parseLastFilterQuery()).toEqual({
      bool: { filter: [{ term: { 'service.name': 'payments' } }] },
    });
  });

  it('falls back to entity.id for a legacy generic identifier without entityStoreId', async () => {
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'generic',
      identifier: 'device:abc',
    };

    renderHook(() => useEntityForAttachment(identifier), { wrapper: createWrapper() });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    expect(parseLastFilterQuery()).toEqual({
      bool: { filter: [{ term: { 'entity.id': 'device:abc' } }] },
    });
  });

  it('does not issue a fetch when no identifier value is provided', async () => {
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'user',
      identifier: '',
    };

    renderHook(() => useEntityForAttachment(identifier), { wrapper: createWrapper() });

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockFetch).not.toHaveBeenCalled();
  });

  // Elasticsearch serialises a single-value `keyword` field as a bare string,
  // so an entity in exactly one watchlist comes back as a string, not an array.
  // Before the fix this reached `WatchlistsCell.map(...)` and crashed the UI.
  it('normalises a single-string watchlists value into a one-element array', async () => {
    mockFetch.mockResolvedValue({
      records: [
        {
          entity: {
            id: 'host:server1',
            name: 'server1',
            attributes: { watchlists: '4be6078f-d987-471d-bd8f-41dd280437fb' },
          },
        },
      ],
    });

    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'host',
      identifier: 'server1',
    };

    const { result } = renderHook(() => useEntityForAttachment(identifier), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.data?.isEntityInStore).toBe(true));
    expect(result.current.data?.watchlistIds).toEqual(['4be6078f-d987-471d-bd8f-41dd280437fb']);
  });

  describe('resolved mode', () => {
    const target = {
      '@timestamp': '2026-10-29T10:00:00.000Z',
      entity: {
        id: 'host:gold',
        name: 'gold',
        source: 'okta',
        risk: { calculated_score_norm: 13, calculated_level: 'Unknown' },
        relationships: {
          resolution: { risk: { calculated_score_norm: 83, calculated_level: 'High' } },
        },
        lifecycle: {
          first_seen: '2026-10-10T00:00:00.000Z',
          last_activity: '2026-10-29T09:00:00.000Z',
        },
        attributes: { watchlists: 'w1' },
      },
      asset: { criticality: 'low_impact' },
    };
    const alias = {
      '@timestamp': '2026-10-29T11:00:00.000Z',
      entity: {
        id: 'host:alias',
        source: ['entra'],
        lifecycle: {
          first_seen: '2026-10-01T00:00:00.000Z',
          last_activity: '2026-10-29T08:00:00.000Z',
        },
        attributes: { watchlists: ['w2'] },
      },
      asset: { criticality: 'high_impact' },
    };
    const identifier: EntityAttachmentIdentifier = {
      identifierType: 'host',
      identifier: 'gold',
      entityStoreId: 'host:gold',
      mode: 'resolved',
    };

    it("shows the group's values, instead of the entity itself", async () => {
      mockFetch.mockResolvedValue({ target, aliases: [alias], group_size: 2 });

      const { result } = renderHook(() => useEntityForAttachment(identifier), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data?.isEntityInStore).toBe(true));
      expect(result.current.data).toMatchObject({
        riskScore: 83,
        riskLevel: 'High',
        assetCriticality: 'high_impact',
        sources: ['okta', 'entra'],
        watchlistIds: ['w1', 'w2'],
        firstSeen: '2026-10-01T00:00:00.000Z',
        lastSeen: '2026-10-29T09:00:00.000Z',
        timestamp: '2026-10-29T11:00:00.000Z',
      });
    });

    it('shows only the entity itself without the mode', async () => {
      mockFetch.mockResolvedValue({ records: [target] });

      const { result } = renderHook(
        () => useEntityForAttachment({ ...identifier, mode: undefined }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.data?.isEntityInStore).toBe(true));
      expect(result.current.data).toMatchObject({ riskScore: 13, assetCriticality: 'low_impact' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('reads the group in one request, from the resolution group route', async () => {
      mockFetch.mockResolvedValue({ target, aliases: [alias], group_size: 2 });

      const { result } = renderHook(() => useEntityForAttachment(identifier), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.data?.isEntityInStore).toBe(true));
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toMatch(/resolution\/group$/);
      expect(mockFetch.mock.calls[0][1].query).toEqual({ entity_id: 'host:gold' });
    });
  });
});
