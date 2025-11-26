/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CloudConnectorPoliciesFlyout } from '.';
import { useCloudConnectorUsage } from '../hooks/use_cloud_connector_usage';
import { useUpdateCloudConnector } from '../hooks/use_update_cloud_connector';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_cloud_connector_usage');
jest.mock('../hooks/use_update_cloud_connector');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseCloudConnectorUsage = useCloudConnectorUsage as jest.MockedFunction<
  typeof useCloudConnectorUsage
>;
const mockUseUpdateCloudConnector = useUpdateCloudConnector as jest.MockedFunction<
  typeof useUpdateCloudConnector
>;

describe('CloudConnectorPoliciesFlyout', () => {
  let queryClient: QueryClient;
  const mockOnClose = jest.fn();
  const mockNavigateToApp = jest.fn();

  const defaultProps = {
    cloudConnectorId: 'connector-123',
    cloudConnectorName: 'Test Connector',
    cloudConnectorVars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/TestRole' },
    },
    provider: 'aws' as const,
    onClose: mockOnClose,
  };

  const mockUsageData = [
    {
      id: 'policy-1',
      name: 'Test Policy 1',
      package: {
        name: 'cloud_security_posture',
        title: 'Cloud Security Posture',
        version: '1.0.0',
      },
      policy_ids: ['agent-policy-1'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    mockUseKibana.mockReturnValue({
      services: {
        application: {
          navigateToApp: mockNavigateToApp,
        },
      },
    } as any);

    mockUseCloudConnectorUsage.mockReturnValue({
      data: mockUsageData,
      isLoading: false,
      error: null,
    } as any);

    const mockMutate = jest.fn();
    mockUseUpdateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as any);

    mockOnClose.mockClear();
    mockNavigateToApp.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderFlyout = (props = {}) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CloudConnectorPoliciesFlyout {...defaultProps} {...props} />
      </QueryClientProvider>
    );
  };

  it('should render flyout with connector name and ARN', () => {
    renderFlyout();

    expect(screen.getByText('Test Connector')).toBeInTheDocument();
    expect(screen.getByText(/Role ARN:/)).toBeInTheDocument();
    expect(
      screen.getByText('arn:aws:iam::123456789012:role/TestRole', { exact: false })
    ).toBeInTheDocument();
  });

  it('should render usage table with policies', async () => {
    renderFlyout();

    await waitFor(() => {
      expect(screen.getByTestId('cloudConnectorPoliciesTable')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Policy 1')).toBeInTheDocument();
    expect(screen.getByText('Cloud Security Posture')).toBeInTheDocument();
  });

  it('should show empty state when no policies use the connector', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    renderFlyout();

    expect(screen.getByText('No integrations using this connector')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    renderFlyout();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as any);

    renderFlyout();

    expect(screen.getByText('Failed to load policies')).toBeInTheDocument();
  });

  it('should enable save button when name is changed', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const nameInput = screen.getByTestId('cloudConnectorNameInput');
    const saveButton = screen.getByTestId('cloudConnectorSaveNameButton');

    expect(saveButton).toBeDisabled();

    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');

    expect(saveButton).toBeEnabled();
  });

  it('should call mutate when save button is clicked', async () => {
    const user = userEvent.setup();
    const mockMutate = jest.fn();
    mockUseUpdateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as any);

    renderFlyout();

    const nameInput = screen.getByTestId('cloudConnectorNameInput');
    const saveButton = screen.getByTestId('cloudConnectorSaveNameButton');

    await user.clear(nameInput);
    await user.type(nameInput, 'New Name');
    await user.click(saveButton);

    expect(mockMutate).toHaveBeenCalledWith({ name: 'New Name' });
  });

  it('should navigate to policy when clicking policy name', async () => {
    const user = userEvent.setup();
    renderFlyout();

    await waitFor(() => {
      expect(screen.getByText('Test Policy 1')).toBeInTheDocument();
    });

    const policyLink = screen.getByTestId('cloudConnectorPolicyLink');
    await user.click(policyLink);

    expect(mockNavigateToApp).toHaveBeenCalledWith('fleet', {
      path: '/policies/agent-policy-1/edit-integration/policy-1',
    });
  });

  it('should close flyout when onClose is called', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const closeButton = screen.getByLabelText('Closes this dialog');
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should display Azure subscription ID for Azure connector', () => {
    renderFlyout({
      provider: 'azure',
      cloudConnectorVars: {
        azure_credentials_cloud_connector_id: { value: 'subscription-123' },
      },
    });

    expect(screen.getByText(/Subscription ID:/)).toBeInTheDocument();
    expect(screen.getByText('subscription-123', { exact: false })).toBeInTheDocument();
  });
});

