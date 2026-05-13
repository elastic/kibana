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
});
