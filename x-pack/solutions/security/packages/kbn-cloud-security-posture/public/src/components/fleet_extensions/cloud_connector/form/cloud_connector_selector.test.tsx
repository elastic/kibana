/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { CloudConnectorSelector } from './cloud_connector_selector';
import { useGetCloudConnectors } from '../hooks/use_get_cloud_connectors';

jest.mock('@kbn/kibana-react-plugin/public');
jest.mock('../hooks/use_get_cloud_connectors');

const mockUseKibana = useKibana as jest.MockedFunction<typeof useKibana>;
const mockUseGetCloudConnectors = useGetCloudConnectors as jest.MockedFunction<
  typeof useGetCloudConnectors
>;

describe('CloudConnectorSelector', () => {
  let queryClient: QueryClient;
  const mockSetCredentials = jest.fn();

  const mockCloudConnectors = [
    {
      id: 'connector-1',
      name: 'AWS Connector 1',
      cloudProvider: 'aws',
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/Role1' },
        external_id: { value: 'external-id-1' },
      },
      packagePolicyCount: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'connector-2',
      name: 'AWS Connector 2',
      cloudProvider: 'aws',
      vars: {
        role_arn: { value: 'arn:aws:iam::123456789012:role/Role2' },
        external_id: { value: 'external-id-2' },
      },
      packagePolicyCount: 1,
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
          navigateToApp: jest.fn(),
        },
      },
    } as any);

    mockUseGetCloudConnectors.mockReturnValue({
      data: mockCloudConnectors,
      isLoading: false,
      error: null,
    } as any);

    mockSetCredentials.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderSelector = (props = {}) => {
    const defaultProps = {
      provider: 'aws' as const,
      cloudConnectorId: undefined,
      credentials: {},
      setCredentials: mockSetCredentials,
      ...props,
    };

    return render(
      <QueryClientProvider client={queryClient}>
        <CloudConnectorSelector {...defaultProps} />
      </QueryClientProvider>
    );
  };

  it('should render cloud connector selector', () => {
    renderSelector();

    expect(screen.getByText('Cloud Connector Name')).toBeInTheDocument();
  });

  it('should display connectors in dropdown', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId('awsCloudConnectorSuperSelect');
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
      expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
    });
  });

  it('should display info icon for each connector', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId('awsCloudConnectorSuperSelect');
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByTestId('cloudConnectorInfoIcon-connector-1')).toBeInTheDocument();
      expect(screen.getByTestId('cloudConnectorInfoIcon-connector-2')).toBeInTheDocument();
    });
  });

  it('should open flyout when clicking info icon', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId('awsCloudConnectorSuperSelect');
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByTestId('cloudConnectorInfoIcon-connector-1')).toBeInTheDocument();
    });

    const infoIcon = screen.getByTestId('cloudConnectorInfoIcon-connector-1');
    await user.click(infoIcon);

    await waitFor(() => {
      expect(screen.getByTestId('cloudConnectorPoliciesFlyout')).toBeInTheDocument();
    });
  });

  it('should call setCredentials when selecting a connector', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId('awsCloudConnectorSuperSelect');
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
    });

    await user.click(screen.getByText('AWS Connector 1'));

    expect(mockSetCredentials).toHaveBeenCalledWith({
      roleArn: 'arn:aws:iam::123456789012:role/Role1',
      externalId: 'external-id-1',
      cloudConnectorId: 'connector-1',
    });
  });

  it('should display selected connector', () => {
    renderSelector({
      cloudConnectorId: 'connector-1',
    });

    const input = screen.getByDisplayValue('AWS Connector 1');
    expect(input).toBeInTheDocument();
  });

  it('should not call setCredentials when clicking info icon', async () => {
    const user = userEvent.setup();
    renderSelector();

    const selector = screen.getByTestId('awsCloudConnectorSuperSelect');
    await user.click(selector);

    await waitFor(() => {
      expect(screen.getByTestId('cloudConnectorInfoIcon-connector-1')).toBeInTheDocument();
    });

    const infoIcon = screen.getByTestId('cloudConnectorInfoIcon-connector-1');
    await user.click(infoIcon);

    // Info icon click should not trigger connector selection
    expect(mockSetCredentials).not.toHaveBeenCalled();
  });
});
