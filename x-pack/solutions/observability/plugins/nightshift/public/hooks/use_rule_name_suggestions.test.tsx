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
import { useRuleNameSuggestions } from './use_rule_name_suggestions';

jest.mock('./use_kibana');

const post = jest.fn();

describe('useRuleNameSuggestions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({ services: { http: { post } } });
  });

  it('searches rules by name and returns unique names', async () => {
    post.mockResolvedValue({ data: [{ name: 'CPU' }, { name: 'CPU' }, { name: 'Disk' }] });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRuleNameSuggestions('cp'), { wrapper });

    await waitFor(() => expect(result.current.data).toEqual(['CPU', 'Disk']));
    expect(post).toHaveBeenCalledWith(
      '/internal/alerting/rules/_find',
      expect.objectContaining({
        body: expect.stringContaining('"search":"cp*"'),
      })
    );
  });
});
