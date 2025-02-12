/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from './use_kibana';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useDeleteSynonymsSet } from './use_delete_synonyms_set';

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockDelete = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();

describe('useDeleteSynonymsSet hook', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          delete: mockDelete,
        },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
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

  it('should delete the synonyms set if no index is attached', async () => {
    const { result } = renderHook(() => useDeleteSynonymsSet(), { wrapper });

    result.current.mutate({ synonymsSetId: '123' });
    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith('/internal/search_synonyms/synonyms/123')
    );
  });

  it('should show an error message if synonyms set is attached to an index', async () => {
    const error = {
      body: { message: 'Synonyms set is attached to an index and cannot be deleted' },
    };
    mockDelete.mockRejectedValue(error);
    const { result } = renderHook(() => useDeleteSynonymsSet(), { wrapper });

    result.current.mutate({ synonymsSetId: '123' });
    await waitFor(() =>
      expect(mockAddError).toHaveBeenCalledWith(new Error(error.body.message), {
        title: 'Error deleting synonyms set',
        toastMessage: error.body.message,
      })
    );
  });
});
