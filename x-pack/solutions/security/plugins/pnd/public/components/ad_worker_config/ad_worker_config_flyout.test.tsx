/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

const mockUseLoadConnectors = jest.fn();

jest.mock('@kbn/inference-connectors', () => ({
  useLoadConnectors: (...args: unknown[]) => mockUseLoadConnectors(...args),
}));

import { OpenAdWorkerConfigButton } from './open_ad_worker_config_button';

const services = {
  http: { get: jest.fn().mockResolvedValue({ results: [], total: 0 }) },
  notifications: { toasts: { addError: jest.fn() } },
};

const renderButton = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <KibanaContextProvider services={services}>
        <OpenAdWorkerConfigButton />
      </KibanaContextProvider>
    </QueryClientProvider>
  );
};

describe('OpenAdWorkerConfigButton / AdWorkerConfigFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    services.http.get.mockResolvedValue({ results: [], total: 0 });
    mockUseLoadConnectors.mockReturnValue({
      data: [{ id: 'connector-a', name: 'GPT-4o', actionTypeId: '.gen-ai' }],
      isLoading: false,
      soEntryFound: true,
    });
  });

  it('opens a flyout with the numbered steps timeline and inputs preview', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    expect(screen.getByTestId('adWorkerConfigFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('pipelineIndicator')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerStepRetrieval')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerStepGeneration')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerStepValidation')).toBeInTheDocument();
    expect(screen.getByTestId('queryModeSelector')).toBeInTheDocument();

    const preview = screen.getByTestId('adWorkerConfigPreview');
    expect(preview).toHaveTextContent('"run_every": "15m"');
    expect(preview).toHaveTextContent('"validation_workflow_id": "default"');
  });

  it('shows Query-builder fields by default and the ES|QL editor after switching mode', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    // default mode = custom_query (Query builder): size field present, ES|QL editor absent
    expect(screen.getByTestId('adWorkerSize')).toBeInTheDocument();
    expect(screen.queryByTestId('adWorkerEsqlQuery')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('queryModeEsqlModeButton'));

    expect(screen.getByTestId('adWorkerEsqlQuery')).toBeInTheDocument();
    expect(screen.queryByTestId('adWorkerSize')).not.toBeInTheDocument();
  });

  it('loads connectors scoped to the attack_discovery feature', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));

    expect(mockUseLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'attack_discovery' })
    );
  });

  it('closes the flyout via the footer button', () => {
    renderButton();
    fireEvent.click(screen.getByTestId('openAdWorkerConfig'));
    expect(screen.getByTestId('adWorkerConfigFlyout')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('adWorkerConfigClose'));

    expect(screen.queryByTestId('adWorkerConfigFlyout')).not.toBeInTheDocument();
  });
});
