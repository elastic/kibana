/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useKibana } from './use_kibana';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockDelete = jest.fn();
const mockDeleteSuccess = jest.fn();
const mockDeleteError = jest.fn();

describe('useDeleteRuleset hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          delete: mockDelete,
        },
        notifications: {
          toasts: {
            addSuccess: mockDeleteSuccess,
            addError: mockDeleteError,
          },
        },
      },
    });
    mockDelete.mockResolvedValue({});
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const queryClient = new QueryClient();
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  it('should delete the ruleset', async () => {
    const { useDeleteRuleset } = jest.requireActual('./use_delete_query_rules_ruleset');

    const { result } = renderHook(() => useDeleteRuleset(), { wrapper });

    result.current.mutate({ rulesetId: '123' });
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/internal/search_query_rules/ruleset/123')
    );
  });

  it('should show an error message if delete fails', async () => {
    const error = {
      body: { message: 'An error occurred' },
    };
    mockDelete.mockRejectedValue(error);
    const { useDeleteRuleset } = jest.requireActual('./use_delete_query_rules_ruleset');

    const { result } = renderHook(() => useDeleteRuleset(), { wrapper });

    result.current.mutate({ rulesetId: '123' });
    await waitFor(() =>
      expect(mockDeleteError).toHaveBeenCalledWith(new Error(error.body.message), {
        title: 'Error deleting ruleset',
        toastMessage: error.body.message,
      })
    );
  });
});
