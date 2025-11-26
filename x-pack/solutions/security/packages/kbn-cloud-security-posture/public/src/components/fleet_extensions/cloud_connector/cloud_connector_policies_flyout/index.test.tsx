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
import { CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { UseQueryResult } from '@kbn/react-query';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CloudConnectorPoliciesFlyout } from '.';
import type { CloudConnectorUsageItem } from '../hooks/use_cloud_connector_usage';
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

  const mockUsageData: CloudConnectorUsageItem[] = [
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
    } as unknown as ReturnType<typeof useKibana>);

    mockUseCloudConnectorUsage.mockReturnValue({
      data: { items: mockUsageData, total: mockUsageData.length, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    const mockMutate = jest.fn();
    mockUseUpdateCloudConnector.mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useUpdateCloudConnector>);

    mockOnClose.mockClear();
    mockNavigateToApp.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderFlyout = (props = {}) => {
    return render(
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <CloudConnectorPoliciesFlyout {...defaultProps} {...props} />
        </QueryClientProvider>
      </I18nProvider>
    );
  };

  it('should render flyout with connector name and ARN', () => {
    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.TITLE)
    ).toHaveTextContent('Test Connector');
    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IDENTIFIER_TEXT)
    ).toHaveTextContent('Role ARN: arn:aws:iam::123456789012:role/TestRole');
  });

  it('should render usage table with policies', async () => {
    renderFlyout();

    await waitFor(() => {
      expect(
        screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICIES_TABLE)
      ).toBeInTheDocument();
    });

    expect(screen.getByText('Test Policy 1')).toBeInTheDocument();
    expect(screen.getByText('Cloud Security Posture')).toBeInTheDocument();
  });

  it('should show empty state when no policies use the connector', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: { items: [], total: 0, page: 1, perPage: 10 },
      isLoading: false,
      error: null,
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.EMPTY_STATE)
    ).toBeInTheDocument();
    expect(screen.getByText('No integrations using this connector')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    renderFlyout();

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error state', () => {
    mockUseCloudConnectorUsage.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Failed to fetch'),
    } as unknown as UseQueryResult<{ items: CloudConnectorUsageItem[]; total: number; page: number; perPage: number }>);

    renderFlyout();

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.ERROR_STATE)
    ).toBeInTheDocument();
    expect(screen.getByText('Failed to load policies')).toBeInTheDocument();
  });

  it('should enable save button when name is changed', async () => {
    const user = userEvent.setup();
    renderFlyout();

    const nameInput = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT);
    const saveButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.SAVE_NAME_BUTTON
    );

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
    } as unknown as ReturnType<typeof useUpdateCloudConnector>);

    renderFlyout();

    const nameInput = screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.NAME_INPUT);
    const saveButton = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.SAVE_NAME_BUTTON
    );

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

    const policyLink = screen.getByTestId(
      CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.POLICY_LINK
    );
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

    expect(
      screen.getByTestId(CLOUD_CONNECTOR_POLICIES_FLYOUT_TEST_SUBJECTS.IDENTIFIER_TEXT)
    ).toHaveTextContent('Cloud Connector ID: subscription-123');
  });
});
