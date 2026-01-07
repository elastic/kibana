/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { SwitchConnectorModal } from './switch_connector_modal';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';
import { useUpdatePackagePolicyCloudConnector } from '../hooks/use_update_package_policy';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common/constants';
import type { AccountType } from '@kbn/fleet-plugin/common/types';
import type { CloudConnectorCredentials } from '../types';
import { SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common/test_subjects';

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
        data-test-subj="cloud-connector-selector-button"
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
    <I18nProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </I18nProvider>
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

    expect(screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.TITLE)).toBeInTheDocument();
    expect(screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.POLICY_NAME)).toHaveTextContent(
      'Test Policy'
    );
    expect(
      screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.CURRENT_CONNECTOR_NAME)
    ).toHaveTextContent('Current Connector');
  });

  it('shows selector when compatible connectors exist (same provider, account type, excluding current)', () => {
    // Mock data has: current-connector-id (aws, SINGLE_ACCOUNT) and new-connector-id (aws, SINGLE_ACCOUNT)
    // After filtering out current connector, new-connector-id should remain
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    // Selector should be shown because there's at least one compatible connector
    expect(screen.getByTestId('cloud-connector-selector')).toBeInTheDocument();
    // No connectors callout should NOT be shown
    expect(
      screen.queryByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.NO_CONNECTORS_CALLOUT)
    ).not.toBeInTheDocument();
  });

  it('shows no connectors callout when only connectors with different account type exist', () => {
    // Only provide connectors with different account type than what we're looking for
    mockUseGetCloudConnectors.mockReturnValue({
      data: [
        {
          id: 'org-connector',
          name: 'Org Connector',
          cloudProvider: 'aws',
          accountType: ORGANIZATION_ACCOUNT, // Different from SINGLE_ACCOUNT in defaultProps
          vars: {},
          packagePolicyCount: 0,
          created_at: '2023-01-01',
          updated_at: '2023-01-01',
        },
      ],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetCloudConnectors>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    // No connectors callout should be shown because no compatible connectors exist
    expect(
      screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.NO_CONNECTORS_CALLOUT)
    ).toBeInTheDocument();
  });

  it('disables switch button when no connector is selected', () => {
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const switchButton = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.SWITCH_BUTTON);
    expect(switchButton).toBeDisabled();
  });

  it('enables switch button when a connector is selected', async () => {
    const user = userEvent.setup();
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const selectButton = screen.getByTestId('cloud-connector-selector-button');
    await user.click(selectButton);

    await waitFor(() => {
      const switchButton = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.SWITCH_BUTTON);
      expect(switchButton).not.toBeDisabled();
    });
  });

  it('calls update mutation with correct parameters when switching', async () => {
    const user = userEvent.setup();
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const selectButton = screen.getByTestId('cloud-connector-selector-button');
    await user.click(selectButton);

    const switchButton = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.SWITCH_BUTTON);
    await user.click(switchButton);

    expect(mockMutate).toHaveBeenCalledWith({
      packagePolicyId: 'policy-123',
      cloudConnectorId: 'new-connector-id',
    });
  });

  it('shows warning callout about switching impact', () => {
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const warningCallout = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.WARNING_CALLOUT);
    expect(warningCallout).toBeInTheDocument();
    expect(warningCallout).toHaveTextContent('Switching cloud connectors');
    expect(warningCallout).toHaveTextContent(
      'This will change the cloud credentials used by this integration'
    );
  });

  it('shows error message when no compatible connectors are available', () => {
    mockUseGetCloudConnectors.mockReturnValue({
      data: [mockConnectors[0]], // Only current connector
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetCloudConnectors>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const noConnectorsCallout = screen.getByTestId(
      SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.NO_CONNECTORS_CALLOUT
    );
    expect(noConnectorsCallout).toBeInTheDocument();
    expect(noConnectorsCallout).toHaveTextContent('No compatible connectors available');
    expect(noConnectorsCallout).toHaveTextContent('There are no other cloud connectors');
  });

  it('disables switch button when no compatible connectors exist', () => {
    mockUseGetCloudConnectors.mockReturnValue({
      data: [mockConnectors[0]],
      isLoading: false,
      error: null,
    } as ReturnType<typeof useGetCloudConnectors>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const switchButton = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.SWITCH_BUTTON);
    expect(switchButton).toBeDisabled();
  });

  it('shows loading state during update', () => {
    mockUseUpdatePackagePolicyCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: true,
    } as unknown as ReturnType<typeof useUpdatePackagePolicyCloudConnector>);

    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const switchButton = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.SWITCH_BUTTON);
    expect(switchButton).toBeDisabled();
  });

  it('calls onClose when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<SwitchConnectorModal {...defaultProps} />, { wrapper });

    const cancelButton = screen.getByTestId(SWITCH_CONNECTOR_MODAL_TEST_SUBJECTS.CANCEL_BUTTON);
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
