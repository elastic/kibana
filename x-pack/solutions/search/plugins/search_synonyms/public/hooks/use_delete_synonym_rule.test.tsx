/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from './use_kibana';

vi.mock('./use_kibana');

const mockUseKibana = useKibana as Mock;
const mockDelete = vi.fn();
const mockDeleteSuccess = vi.fn();
const mockDeleteError = vi.fn();

describe('useDeleteSynonymRule hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it('should delete the synonym rule', async () => {
    const { useDeleteSynonymRule } = (await vi.importActual('./use_delete_synonym_rule'));

    const { result } = renderHook(() => useDeleteSynonymRule(), { wrapper });

    result.current.mutate({ synonymsSetId: '123', ruleId: '1' });
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/internal/search_synonyms/synonyms/123/1')
    );
  });

  it('should show an error message if delete fails', async () => {
    const error = {
      body: { message: 'An error occurred' },
    };
    mockDelete.mockRejectedValue(error);
    const { useDeleteSynonymRule } = (await vi.importActual('./use_delete_synonym_rule'));

    const { result } = renderHook(() => useDeleteSynonymRule(), { wrapper });

    result.current.mutate({ synonymsSetId: '123', ruleId: '1' });
    await waitFor(() =>
      expect(mockDeleteError).toHaveBeenCalledWith(new Error(error.body.message), {
        title: 'Error deleting synonym rule',
        toastMessage: error.body.message,
      })
    );
  });
});
