/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';

import * as i18n from './translations';
import { useAddEndpoint } from './use_add_endpoint';
import { useKibana } from './use_kibana';

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

const mockConfig: any = {
  provider: 'elasticsearch',
  taskType: 'text_embedding',
  inferenceId: 'es-endpoint-1',
  providerConfig: {
    num_allocations: 1,
    num_threads: 2,
    model_id: '.multilingual-e5-small',
  },
};
const mockSecrets: any = { providerSecrets: {} };

const mockInferenceEndpoint = {
  config: mockConfig,
  secrets: mockSecrets,
};

jest.mock('./use_kibana');

const mockUseKibana = useKibana as jest.Mock;
const mockAdd = jest.fn();
const mockAddSuccess = jest.fn();
const mockAddError = jest.fn();
const mockOnSuccess = jest.fn();
const mockOnError = jest.fn();

describe('useAddEndpoint', () => {
  beforeEach(() => {
    mockUseKibana.mockReturnValue({
      services: {
        http: {
          put: mockAdd,
        },
        notifications: {
          toasts: {
            addSuccess: mockAddSuccess,
            addError: mockAddError,
          },
        },
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('show call add inference endpoint and show success toast', async () => {
    const { result } = renderHook(() => useAddEndpoint(mockOnSuccess, mockOnError), { wrapper });

    result.current.mutate({ inferenceEndpoint: mockInferenceEndpoint });

    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith(
        '/internal/inference_endpoint/endpoints/text_embedding/es-endpoint-1',
        {
          body: JSON.stringify(mockInferenceEndpoint),
        }
      )
    );
    expect(mockAddSuccess).toHaveBeenCalledWith({
      title: i18n.ENDPOINT_ADDED_SUCCESS,
    });
    expect(mockOnSuccess).toHaveBeenCalled();
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('should show error toast on failure', async () => {
    const error = { body: { message: 'error' } };
    mockAdd.mockRejectedValue(error);
    const { result } = renderHook(() => useAddEndpoint(mockOnSuccess, mockOnError), { wrapper });

    result.current.mutate({ inferenceEndpoint: mockInferenceEndpoint });

    await waitFor(() => {
      expect(mockAddError).toHaveBeenCalled();
      expect(mockOnSuccess).not.toHaveBeenCalled();
      expect(mockOnError).toHaveBeenCalled();
    });
  });
});
