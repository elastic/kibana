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
  application: { navigateToApp: jest.fn() },
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

const open = () => {
  renderButton();
  fireEvent.click(screen.getByTestId('openAdWorkerConfig'));
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
    open();
    expect(screen.getByTestId('adWorkerConfigFlyout')).toBeInTheDocument();
    expect(screen.getByTestId('pipelineIndicator')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerStepRetrieval')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerStepGeneration')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerStepValidation')).toBeInTheDocument();

    const preview = screen.getByTestId('adWorkerConfigPreview');
    expect(preview).toHaveTextContent('"run_every": "15m"');
    expect(preview).toHaveTextContent('"validation_workflow_id": "default"');
  });

  it('has retrieval switch buttons; ES|QL editor is pre-populated and hides when the switch is off', () => {
    open();

    expect(screen.getByTestId('adWorkerDefaultRetrievalSwitch')).toBeInTheDocument();
    expect(screen.getByTestId('adWorkerRetrievalWorkflowsSwitch')).toBeInTheDocument();

    const esql = screen.getByTestId('adWorkerEsqlQuery') as HTMLTextAreaElement;
    expect(esql.value).toContain('FROM .alerts-security.alerts-default');

    fireEvent.click(screen.getByTestId('adWorkerDefaultRetrievalSwitch'));
    expect(screen.queryByTestId('adWorkerEsqlQuery')).not.toBeInTheDocument();
  });

  it('reveals the retrieval workflows selector when its switch is enabled', () => {
    open();

    expect(screen.queryByTestId('adWorkerRetrievalWorkflows')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('adWorkerRetrievalWorkflowsSwitch'));
    expect(screen.getByTestId('adWorkerRetrievalWorkflows')).toBeInTheDocument();
  });

  it('lists connectors (attack_discovery) with an "+ Add model" option', () => {
    open();

    expect(mockUseLoadConnectors).toHaveBeenCalledWith(
      expect.objectContaining({ featureId: 'attack_discovery' })
    );

    fireEvent.click(screen.getByTestId('adWorkerConnector'));
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveTextContent('GPT-4o');
    expect(listbox).toHaveTextContent('+ Add model');
  });

  it('closes the flyout via the footer button', () => {
    open();
    expect(screen.getByTestId('adWorkerConfigFlyout')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('adWorkerConfigClose'));
    expect(screen.queryByTestId('adWorkerConfigFlyout')).not.toBeInTheDocument();
  });
});
