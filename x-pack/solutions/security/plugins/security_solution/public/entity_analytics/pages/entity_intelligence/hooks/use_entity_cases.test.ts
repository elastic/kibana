/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import { useEntityCases } from './use_entity_cases';

const mockHttpFetch = jest.fn();
const mockAlertSearch = jest.fn();
let mockRunQuery: (context: { signal?: AbortSignal }) => Promise<{ isPartial: boolean }>;

jest.mock('@kbn/react-query', () => ({
  useQuery: (_key: string[], queryFn: typeof mockRunQuery) => {
    mockRunQuery = queryFn;
    return { data: undefined, isLoading: false, isError: false };
  },
}));
jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: () => ({ services: { http: { fetch: mockHttpFetch } } }),
}));
jest.mock('../../../../detections/containers/detection_engine/alerts/api', () => ({
  fetchQueryAlerts: (input: object) => mockAlertSearch(input),
}));

describe('case evidence completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlertSearch.mockResolvedValue({ hits: { hits: [] } });
  });

  it('accepts a complete empty cases response', async () => {
    mockHttpFetch.mockResolvedValueOnce({ cases: [], total: 0 });
    renderHook(() => useEntityCases());
    await expect(mockRunQuery({})).resolves.toMatchObject({ isPartial: false });
  });

  it('marks omitted cases as partial instead of inferring no association', async () => {
    mockHttpFetch.mockResolvedValueOnce({
      cases: [{ id: 'case-1', title: 'Latest', totalAlerts: 0 }],
      total: 101,
    });
    renderHook(() => useEntityCases());
    await expect(mockRunQuery({})).resolves.toMatchObject({ isPartial: true });
  });

  it('preserves a failed case-alert fetch as partial evidence', async () => {
    mockHttpFetch.mockResolvedValueOnce({
      cases: [{ id: 'case-1', title: 'Case', totalAlerts: 1 }],
      total: 1,
    });
    mockHttpFetch.mockRejectedValueOnce(new Error('Forbidden'));
    renderHook(() => useEntityCases());
    await expect(mockRunQuery({})).resolves.toMatchObject({ isPartial: true });
  });

  it('marks linked alerts that cannot be read as incomplete', async () => {
    mockHttpFetch.mockResolvedValueOnce({
      cases: [{ id: 'case-1', title: 'Case', totalAlerts: 1 }],
      total: 1,
    });
    mockHttpFetch.mockResolvedValueOnce([
      { id: 'alert-1', index: 'alerts', attached_at: '2026-10-12' },
    ]);
    renderHook(() => useEntityCases());
    await expect(mockRunQuery({})).resolves.toMatchObject({ isPartial: true });
  });

  it('bounds large alert lookups and exposes their truncation', async () => {
    mockHttpFetch.mockResolvedValueOnce({
      cases: [{ id: 'case-1', title: 'Case', totalAlerts: 2001 }],
      total: 1,
    });
    mockHttpFetch.mockResolvedValueOnce(
      Array.from({ length: 2001 }, (_, index) => ({
        id: `alert-${index}`,
        index: 'alerts',
        attached_at: '2026-10-12',
      }))
    );
    renderHook(() => useEntityCases());
    await expect(mockRunQuery({})).resolves.toMatchObject({ isPartial: true });
    expect(mockAlertSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: expect.objectContaining({ size: 2000 }) })
    );
  });
});
