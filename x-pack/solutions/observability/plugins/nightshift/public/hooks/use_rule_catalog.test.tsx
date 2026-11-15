/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';
import { useRuleCatalog } from './use_rule_catalog';

jest.mock('./use_kibana');

const post = jest.fn();

describe('useRuleCatalog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { post } } });
  });

  it('loads Observability rules with their tags', async () => {
    post.mockResolvedValue({
      data: [
        { name: 'CPU', tags: ['infra'], id: '1' },
        { name: 'Disk', tags: [], id: '2' },
      ],
      total: 2,
    });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRuleCatalog(), { wrapper });

    await waitFor(() =>
      expect(result.current.data).toEqual([
        { name: 'CPU', tags: ['infra'] },
        { name: 'Disk', tags: [] },
      ])
    );
    expect(post).toHaveBeenCalledWith(
      '/internal/alerting/rules/_find',
      expect.objectContaining({
        body: expect.stringContaining('"rule_type_ids":["apm.error_rate"'),
      })
    );
  });
});
