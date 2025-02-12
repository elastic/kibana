/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import InferenceFlyoutWrapper from '@kbn/inference-endpoint-ui-common';
import { useKibana } from '../../hooks/use_kibana';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { EditInferenceFlyout } from './edit_inference_flyout';
import { useQueryInferenceEndpoints } from '../../hooks/use_inference_endpoints';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InferenceEndpointUI } from '../all_inference_endpoints/types';

jest.mock('../../hooks/use_kibana');
jest.mock('../../hooks/use_inference_endpoints');
jest.mock('@kbn/inference-endpoint-ui-common/src/components/inference_flyout_wrapper', () => ({
  InferenceFlyoutWrapper: jest.fn(() => <div data-test-subj="inferenceFlyoutWrapper" />),
}));

const mockUseKibana = useKibana as jest.Mock;
const mockUseQueryInferenceEndpoints = useQueryInferenceEndpoints as jest.Mock;

describe('EditInferenceFlyout', () => {
  const mockOnFlyoutClose = jest.fn();
  const mockRefetch = jest.fn();
  const mockToasts = { addSuccess: jest.fn(), addError: jest.fn() };
  const mockHttp = jest.fn();

  const mockInferenceEndpointUI = {
    endpoint: 'test-endpoint',
    type: 'sparse_embedding',
    provider: {
      service: 'openai',
      service_settings: {
        api_key: 'valueA',
        organization_id: 'valueB',
        url: 'https://someurl.com/chat/completions',
        model_id: 'third-party',
      },
    },
  } as InferenceEndpointUI;

  const queryClient = new QueryClient();
  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <EditInferenceFlyout
          onFlyoutClose={mockOnFlyoutClose}
          inferenceEndpointUI={mockInferenceEndpointUI}
        />
      </QueryClientProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseKibana.mockReturnValue({
      services: {
        http: mockHttp,
        notifications: { toasts: mockToasts },
      },
    });

    mockUseQueryInferenceEndpoints.mockReturnValue({
      refetch: mockRefetch,
    });
  });

  it('renders InferenceFlyoutWrapper with correct props', () => {
    renderComponent();

    expect(screen.getByTestId('inferenceFlyoutWrapper')).toBeInTheDocument();
    expect(InferenceFlyoutWrapper).toHaveBeenCalledWith(
      expect.objectContaining({
        onFlyoutClose: mockOnFlyoutClose,
        http: mockHttp,
        toasts: mockToasts,
        isEdit: true,
        onSubmitSuccess: expect.any(Function),
        inferenceEndpoint: {
          config: {
            inferenceId: mockInferenceEndpointUI.endpoint,
            taskType: mockInferenceEndpointUI.type,
            provider: mockInferenceEndpointUI.provider.service,
            providerConfig: {
              api_key: 'valueA',
              organization_id: 'valueB',
              url: 'https://someurl.com/chat/completions',
              model_id: 'third-party',
            },
          },
          secrets: {
            providerSecrets: {},
          },
        },
      }),
      {}
    );
  });

  it('calls refetch on edit success', () => {
    renderComponent();
    // Extract the onSubmitSuccess function from the props passed to the InferenceFlyoutWrapper
    const wrapperProps = (InferenceFlyoutWrapper as jest.Mock).mock.calls[0][0];
    const { onSubmitSuccess } = wrapperProps;
    // Simulate the success callback
    onSubmitSuccess();

    expect(mockRefetch).toHaveBeenCalled();
  });
});
