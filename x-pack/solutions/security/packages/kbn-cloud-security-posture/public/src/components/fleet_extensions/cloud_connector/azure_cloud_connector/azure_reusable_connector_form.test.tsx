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
import type { CloudProvider } from '@kbn/fleet-plugin/public';
import { AzureReusableConnectorForm } from './azure_reusable_connector_form';
import type { AzureCloudConnectorCredentials } from '../types';

// Mock the useGetCloudConnectors hook
jest.mock('../hooks/use_get_cloud_connectors');

interface UseGetCloudConnectorsReturn {
  data:
    | Array<{
        id: string;
        name: string;
        vars: Record<string, { value: string }>;
      }>
    | undefined;
  isLoading: boolean;
}

const mockUseGetCloudConnectors = jest.requireMock('../hooks/use_get_cloud_connectors')
  .useGetCloudConnectors as jest.MockedFunction<
  (provider?: CloudProvider) => UseGetCloudConnectorsReturn
>;

// Helper to render with I18n provider
const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

// Mock cloud connector data
const mockCloudConnectors = [
  {
    id: 'connector-1',
    name: 'Azure Connector 1',
    vars: {
      tenant_id: { value: 'tenant-123' },
      client_id: { value: 'client-456' },
      azure_credentials_cloud_connector_id: { value: 'azure-cc-789' },
    },
  },
  {
    id: 'connector-2',
    name: 'Azure Connector 2',
    vars: {
      tenant_id: { value: 'tenant-abc' },
      client_id: { value: 'client-def' },
      azure_credentials_cloud_connector_id: { value: 'azure-cc-ghi' },
    },
  },
];

describe('AzureReusableConnectorForm', () => {
  const mockSetCredentials = jest.fn();

  const defaultProps = {
    cloudConnectorId: undefined,
    isEditPage: false,
    credentials: {
      tenantId: undefined,
      clientId: undefined,
      azure_credentials_cloud_connector_id: undefined,
      cloudConnectorId: undefined,
    } as AzureCloudConnectorCredentials,
    setCredentials: mockSetCredentials,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetCloudConnectors.mockReturnValue({
      data: mockCloudConnectors,
      isLoading: false,
    });
  });

  describe('Rendering', () => {
    it('renders the combo box with instructions', () => {
      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      // Verify instructions text is present
      expect(screen.getByText(/To streamline your Azure integration process/i)).toBeInTheDocument();

      // Verify the combo box label is present
      expect(screen.getByText('Azure Cloud Connector')).toBeInTheDocument();

      // Verify combo box is rendered
      const comboBox = screen.getByRole('combobox');
      expect(comboBox).toBeInTheDocument();
    });

    it('renders combo box with available connectors as options', async () => {
      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByRole('combobox');

      // Click to open options
      await userEvent.click(comboBox);

      // Wait for options to appear
      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
        expect(screen.getByText('Azure Connector 2')).toBeInTheDocument();
      });
    });

    it('renders with no connectors available', () => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      // Combo box should still render
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('renders with selected connector when cloudConnectorId is provided', async () => {
      const propsWithSelection = {
        ...defaultProps,
        cloudConnectorId: 'connector-1',
      };

      renderWithIntl(<AzureReusableConnectorForm {...propsWithSelection} />);

      // Wait for selected option to be displayed
      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
      });
    });

    it('renders with selected connector when credentials.cloudConnectorId is provided', async () => {
      const propsWithSelection = {
        ...defaultProps,
        credentials: {
          ...defaultProps.credentials,
          cloudConnectorId: 'connector-2',
        },
      };

      renderWithIntl(<AzureReusableConnectorForm {...propsWithSelection} />);

      // Wait for selected option to be displayed
      await waitFor(() => {
        expect(screen.getByText('Azure Connector 2')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('calls setCredentials with correct values when a connector is selected', async () => {
      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByRole('combobox');
      await userEvent.click(comboBox);

      // Select first connector
      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Azure Connector 1'));

      // Verify setCredentials was called with correct values
      expect(mockSetCredentials).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        azure_credentials_cloud_connector_id: 'azure-cc-789',
        cloudConnectorId: 'connector-1',
      });
    });

    it('calls setCredentials with second connector values when selected', async () => {
      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByRole('combobox');
      await userEvent.click(comboBox);

      // Select second connector
      await waitFor(() => {
        expect(screen.getByText('Azure Connector 2')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Azure Connector 2'));

      // Verify setCredentials was called with correct values
      expect(mockSetCredentials).toHaveBeenCalledWith({
        tenantId: 'tenant-abc',
        clientId: 'client-def',
        azure_credentials_cloud_connector_id: 'azure-cc-ghi',
        cloudConnectorId: 'connector-2',
      });
    });

    it('clears credentials when selection is removed', async () => {
      const propsWithSelection = {
        ...defaultProps,
        cloudConnectorId: 'connector-1',
      };

      renderWithIntl(<AzureReusableConnectorForm {...propsWithSelection} />);

      // Wait for initial selection to render
      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
      });

      // Find and click the clear button (close icon)
      const clearButton = screen.getByRole('button', { name: /clear/i });
      await userEvent.click(clearButton);

      // Verify setCredentials was called to clear values
      expect(mockSetCredentials).toHaveBeenCalledWith({
        tenantId: undefined,
        clientId: undefined,
        azure_credentials_cloud_connector_id: undefined,
        cloudConnectorId: undefined,
      });
    });
  });

  describe('Hook Integration', () => {
    it('calls useGetCloudConnectors with correct provider', () => {
      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      // Verify hook was called with AZURE_PROVIDER
      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith('azure');
    });

    it('handles empty connector list', async () => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: [],
        isLoading: false,
      });

      renderWithIntl(<AzureReusableConnectorForm {...defaultProps} />);

      const comboBox = screen.getByRole('combobox');
      await userEvent.click(comboBox);

      // Should show "No options found" or similar empty state
      await waitFor(() => {
        // EuiComboBox typically shows this when no options are available
        expect(screen.queryByText('Azure Connector 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Azure Connector 2')).not.toBeInTheDocument();
      });
    });
  });
});
