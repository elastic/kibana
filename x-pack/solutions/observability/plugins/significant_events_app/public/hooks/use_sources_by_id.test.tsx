/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { NightshiftSource } from '@kbn/nightshift-shared';
import { useKibana } from './use_kibana';
import { useSourcesById } from './use_sources_by_id';

jest.mock('./use_kibana', () => ({ useKibana: jest.fn() }));

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;

const nginxSource: NightshiftSource = {
  id: 'source-1',
  title: 'Nginx errors',
  tags: [],
  esql: 'FROM logs-nginx-*',
  slug: 'nginx-errors',
  view_name: '$.nightshift.sources.default.nginx-errors',
  enabled: true,
  created_by: 'marco',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  esql_updated_at: '2026-09-01T00:00:00.000Z',
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useSourcesById', () => {
  beforeEach(() => {
    const fetch = jest.fn().mockResolvedValue({ sources: [nginxSource], total: 1 });
    mockUseKibana.mockReturnValue({
      core: { notifications: { toasts: { addError: jest.fn() } } },
      dependencies: {
        start: { nightshiftSources: { getClient: jest.fn().mockResolvedValue({ fetch }) } },
      },
    } as never);
  });

  it('shows the title of a known source and the raw value of anything else', async () => {
    const { result } = renderHook(() => useSourcesById(), { wrapper });

    await waitFor(() => expect(result.current.sourcesById.size).toBe(1));
    expect(result.current.getSourceTitle('source-1')).toBe('Nginx errors');
    expect(result.current.getSourceTitle('logs.legacy-stream')).toBe('logs.legacy-stream');
  });

  it('keeps the same getSourceTitle across renders while the list is unchanged', async () => {
    const { result, rerender } = renderHook(() => useSourcesById(), { wrapper });
    await waitFor(() => expect(result.current.sourcesById.size).toBe(1));
    const { getSourceTitle } = result.current;

    rerender();

    expect(result.current.getSourceTitle).toBe(getSourceTitle);
  });
});
