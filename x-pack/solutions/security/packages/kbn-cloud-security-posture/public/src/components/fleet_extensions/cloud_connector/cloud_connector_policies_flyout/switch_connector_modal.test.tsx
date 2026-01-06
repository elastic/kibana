/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SwitchConnectorModal } from './switch_connector_modal';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useUpdatePackagePolicyCloudConnector } from '../hooks/use_update_package_policy';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common/constants';
import type { AccountType } from '@kbn/fleet-plugin/common/types';
import type { CloudConnectorCredentials } from '../types';

// Mock the hooks
jest.mock('../hooks/use_get_cloud_connectors');
jest.mock('../hooks/use_update_package_policy');
jest.mock('../form/cloud_connector_selector', () => ({
  CloudConnectorSelector: ({
    setCredentials,
  }: {
    setCredentials: (credentials: CloudConnectorCredentials) => void;
  }) => (
    <div data-test-subj="cloud-connector-selector">
      <button
        type="button"
        onClick={() =>
          setCredentials({
            cloudConnectorId: 'new-connector-id',
          })
        }
      >
        {'Select Connector'}
      </button>
    </div>
  ),
}));

const mockUseGetCloudConnectors = useGetCloudConnectors as jest.MockedFunction<
  typeof useGetCloudConnectors
>;
const mockUseUpdatePackagePolicyCloudConnector =
  useUpdatePackagePolicyCloudConnector as jest.MockedFunction<
    typeof useUpdatePackagePolicyCloudConnector
  >;

describe('SwitchConnectorModal', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();
  const mockMutate = jest.fn();

  const defaultProps = {
    packagePolicyId: 'policy-123',
    packagePolicyName: 'Test Policy',
    currentCloudConnectorId: 'current-connector-id',
    currentCloudConnectorName: 'Current Connector',
    provider: 'aws' as const,
    accountType: SINGLE_ACCOUNT as AccountType,
    onClose: mockOnClose,
    onSuccess: mockOnSuccess,
  };

  const mockConnectors = [
    {
      id: 'current-connector-id',
      name: 'Current Connector',
      cloudProvider: 'aws',
      accountType: SINGLE_ACCOUNT,
      vars: {},
      packagePolicyCount: 1,
      created_at: '2023-01-01',
      updated_at: '2023-01-01',
    },
    {
      id: 'new-connector-id',
      name: 'New Connector',
      cloudProvider: 'aws',
      accountType: SINGLE_ACCOUNT,
      vars: {},
      packagePolicyCount: 0,
      created_at: '2023-01-02',
      updated_at: '2023-01-02',
    },
    {
      id: 'different-account-type',
      name: 'Different Account Type',
      cloudProvider: 'aws',
      accountType: ORGANIZATION_ACCOUNT,
      vars: {},
      packagePolicyCount: 0,
      created_at: '2023-01-03',
      updated_at: '2023-01-03',
    },
  ];

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetCloudConnectors.mockReturnValue({
      data: mockConnectors,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetCloudConnectors>);
    mockUseUpdatePackagePolicyCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useUpdatePackagePolicyCloudConnector>);
  });

  it('renders modal with correct title and current connector info', () => {
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    expect(screen.getByText('Switch Cloud Connector')).toBeInTheDocument();
    expect(screen.getByText('Test Policy')).toBeInTheDocument();
    expect(screen.getByText('Current Connector')).toBeInTheDocument();
  });

  it('filters connectors by provider and account type, excluding current connector', () => {
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    // Should render the CloudConnectorSelector with filtered connectors
    expect(screen.getByTestId('cloud-connector-selector')).toBeInTheDocument();
  });

  it('disables switch button when no connector is selected', () => {
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const switchButton = screen.getByText('Switch Connector');
    expect(switchButton).toBeDisabled();
  });

  it('enables switch button when a connector is selected', async () => {
    const user = userEvent.setup();
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const selectButton = screen.getByText('Select Connector');
    await user.click(selectButton);

    await waitFor(() => {
      const switchButton = screen.getByText('Switch Connector');
      expect(switchButton).not.toBeDisabled();
    });
  });

  it('calls update mutation with correct parameters when switching', async () => {
    const user = userEvent.setup();
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    // Select a connector
    const selectButton = screen.getByText('Select Connector');
    await user.click(selectButton);

    // Click switch button
    const switchButton = screen.getByText('Switch Connector');
    await user.click(switchButton);

    expect(mockMutate).toHaveBeenCalledWith({
      packagePolicyId: 'policy-123',
      cloudConnectorId: 'new-connector-id',
    });
  });

  it('shows warning callout about switching impact', () => {
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    expect(screen.getByText('Switching cloud connectors')).toBeInTheDocument();
    expect(
      screen.getByText(/This will change the cloud credentials used by this integration/)
    ).toBeInTheDocument();
  });

  it('shows error message when no compatible connectors are available', () => {
    mockUseGetCloudConnectors.mockReturnValue({
      data: [mockConnectors[0]], // Only current connector
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetCloudConnectors>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    expect(screen.getByText('No compatible connectors available')).toBeInTheDocument();
    expect(screen.getByText(/There are no other cloud connectors/)).toBeInTheDocument();
  });

  it('disables switch button when no compatible connectors exist', () => {
    mockUseGetCloudConnectors.mockReturnValue({
      data: [mockConnectors[0]],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetCloudConnectors>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const switchButton = screen.getByText('Switch Connector');
    expect(switchButton).toBeDisabled();
  });

  it('shows loading state during update', () => {
    mockUseUpdatePackagePolicyCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: true,
    } as unknown as ReturnType<typeof useUpdatePackagePolicyCloudConnector>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const switchButton = screen.getByText('Switch Connector');
    expect(switchButton.closest('button')).toHaveAttribute('disabled');
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
