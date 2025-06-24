/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

const mockHttpGet = jest.fn();

jest.mock('./use_kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      http: {
        get: mockHttpGet,
      },
    },
  }),
}));

describe('useFetchQueryRulesetExist Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('should run onNoConflict when ruleset does not exist', async () => {
    const { useFetchQueryRulesetExist } = jest.requireActual('./use_fetch_ruleset_exists');
    const onNoConflict = jest.fn();
    const onConflict = jest.fn();

    mockHttpGet.mockResolvedValue({ exists: false });
    const { result } = renderHook(
      () => useFetchQueryRulesetExist('non-existent-ruleset', onNoConflict, onConflict),
      { wrapper }
    );

    await waitFor(() =>
      expect(mockHttpGet).toHaveBeenCalledWith(
        '/internal/search_query_rules/ruleset/non-existent-ruleset/exists'
      )
    );

    await waitFor(() => expect(result.current.data).toBe(false));
    await waitFor(() => expect(onNoConflict).toHaveBeenCalled());
    await waitFor(() => expect(onConflict).not.toHaveBeenCalled());
  });

  it('should run onConflict when ruleset exists', async () => {
    const { useFetchQueryRulesetExist } = jest.requireActual('./use_fetch_ruleset_exists');
    const onNoConflict = jest.fn();
    const onConflict = jest.fn();

    mockHttpGet.mockResolvedValue({ exists: true });

    const { result } = renderHook(
      () => useFetchQueryRulesetExist('existing-ruleset', onNoConflict, onConflict),
      { wrapper }
    );

    await waitFor(() =>
      expect(mockHttpGet).toHaveBeenCalledWith(
        '/internal/search_query_rules/ruleset/existing-ruleset/exists'
      )
    );

    await waitFor(() => expect(result.current.data).toBe(true));
    await waitFor(() => expect(onNoConflict).not.toHaveBeenCalled());
    await waitFor(() => expect(onConflict).toHaveBeenCalled());
  });
});
