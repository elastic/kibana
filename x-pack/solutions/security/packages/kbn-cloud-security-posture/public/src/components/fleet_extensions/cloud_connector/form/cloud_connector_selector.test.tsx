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
import {
  AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
  AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import { CloudConnectorSelector } from './cloud_connector_selector';
import type { AwsCloudConnectorCredentials, AzureCloudConnectorCredentials } from '../types';

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

// Mock cloud connector data for AWS
const mockAwsCloudConnectors = [
  {
    id: 'aws-connector-1',
    name: 'AWS Connector 1',
    vars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/Role1' },
      external_id: { value: 'external-id-123' },
    },
  },
  {
    id: 'aws-connector-2',
    name: 'AWS Connector 2',
    vars: {
      role_arn: { value: 'arn:aws:iam::123456789012:role/Role2' },
      external_id: { value: 'external-id-456' },
    },
  },
];

// Mock cloud connector data for Azure
const mockAzureCloudConnectors = [
  {
    id: 'azure-connector-1',
    name: 'Azure Connector 1',
    vars: {
      tenant_id: { value: 'tenant-123' },
      client_id: { value: 'client-456' },
      azure_credentials_cloud_connector_id: { value: 'azure-cc-789' },
    },
  },
];

describe('CloudConnectorSelector', () => {
  const mockSetCredentials = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('AWS Provider', () => {
    const awsProps = {
      provider: 'aws' as CloudProvider,
      cloudConnectorId: undefined,
      credentials: {
        roleArn: undefined,
        externalId: undefined,
        cloudConnectorId: undefined,
      } as AwsCloudConnectorCredentials,
      setCredentials: mockSetCredentials,
    };

    beforeEach(() => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: mockAwsCloudConnectors,
        isLoading: false,
      });
    });

    it('displays AWS cloud connectors as options', async () => {
      renderWithIntl(<CloudConnectorSelector {...awsProps} />);

      const select = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(select);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
        expect(screen.getByText('AWS Connector 2')).toBeInTheDocument();
      });
    });

    it('calls setCredentials with correct AWS values when connector is selected', async () => {
      renderWithIntl(<CloudConnectorSelector {...awsProps} />);

      const select = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(select);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('AWS Connector 1'));

      expect(mockSetCredentials).toHaveBeenCalledWith({
        roleArn: 'arn:aws:iam::123456789012:role/Role1',
        externalId: 'external-id-123',
        cloudConnectorId: 'aws-connector-1',
      });
    });

    it('displays selected AWS connector', async () => {
      const propsWithSelection = {
        ...awsProps,
        cloudConnectorId: 'aws-connector-1',
      };

      renderWithIntl(<CloudConnectorSelector {...propsWithSelection} />);

      await waitFor(() => {
        expect(screen.getByText('AWS Connector 1')).toBeInTheDocument();
      });
    });
  });

  describe('Azure Provider', () => {
    const azureProps = {
      provider: 'azure' as CloudProvider,
      cloudConnectorId: undefined,
      credentials: {
        tenantId: undefined,
        clientId: undefined,
        azure_credentials_cloud_connector_id: undefined,
        cloudConnectorId: undefined,
      } as AzureCloudConnectorCredentials,
      setCredentials: mockSetCredentials,
    };

    beforeEach(() => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: mockAzureCloudConnectors,
        isLoading: false,
      });
    });

    it('displays Azure cloud connectors as options', async () => {
      renderWithIntl(<CloudConnectorSelector {...azureProps} />);

      const select = screen.getByTestId(AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(select);

      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
      });
    });

    it('calls setCredentials with correct Azure values when connector is selected', async () => {
      renderWithIntl(<CloudConnectorSelector {...azureProps} />);

      const select = screen.getByTestId(AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      await userEvent.click(select);

      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
      });

      await userEvent.click(screen.getByText('Azure Connector 1'));

      expect(mockSetCredentials).toHaveBeenCalledWith({
        tenantId: 'tenant-123',
        clientId: 'client-456',
        azure_credentials_cloud_connector_id: 'azure-cc-789',
        cloudConnectorId: 'azure-connector-1',
      });
    });

    it('displays selected Azure connector', async () => {
      const propsWithSelection = {
        ...azureProps,
        cloudConnectorId: 'azure-connector-1',
      };

      renderWithIntl(<CloudConnectorSelector {...propsWithSelection} />);

      await waitFor(() => {
        expect(screen.getByText('Azure Connector 1')).toBeInTheDocument();
      });
    });
  });

  describe('Hook Integration', () => {
    it('calls useGetCloudConnectors with correct AWS provider', () => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: mockAwsCloudConnectors,
        isLoading: false,
      });

      const props = {
        provider: 'aws' as CloudProvider,
        cloudConnectorId: undefined,
        credentials: {
          roleArn: undefined,
          externalId: undefined,
          cloudConnectorId: undefined,
        } as AwsCloudConnectorCredentials,
        setCredentials: mockSetCredentials,
      };

      renderWithIntl(<CloudConnectorSelector {...props} />);

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith('aws');
    });

    it('calls useGetCloudConnectors with correct Azure provider', () => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: mockAzureCloudConnectors,
        isLoading: false,
      });

      const props = {
        provider: 'azure' as CloudProvider,
        cloudConnectorId: undefined,
        credentials: {
          tenantId: undefined,
          clientId: undefined,
          azure_credentials_cloud_connector_id: undefined,
          cloudConnectorId: undefined,
        } as AzureCloudConnectorCredentials,
        setCredentials: mockSetCredentials,
      };

      renderWithIntl(<CloudConnectorSelector {...props} />);

      expect(mockUseGetCloudConnectors).toHaveBeenCalledWith('azure');
    });

    it('renders with correct test subject for AWS provider', () => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: mockAwsCloudConnectors,
        isLoading: false,
      });

      const props = {
        provider: 'aws' as CloudProvider,
        cloudConnectorId: undefined,
        credentials: {
          roleArn: undefined,
          externalId: undefined,
          cloudConnectorId: undefined,
        } as AwsCloudConnectorCredentials,
        setCredentials: mockSetCredentials,
      };

      renderWithIntl(<CloudConnectorSelector {...props} />);

      const select = screen.getByTestId(AWS_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      expect(select).toBeInTheDocument();
    });

    it('renders with correct test subject for Azure provider', () => {
      mockUseGetCloudConnectors.mockReturnValue({
        data: mockAzureCloudConnectors,
        isLoading: false,
      });

      const props = {
        provider: 'azure' as CloudProvider,
        cloudConnectorId: undefined,
        credentials: {
          tenantId: undefined,
          clientId: undefined,
          azure_credentials_cloud_connector_id: undefined,
          cloudConnectorId: undefined,
        } as AzureCloudConnectorCredentials,
        setCredentials: mockSetCredentials,
      };

      renderWithIntl(<CloudConnectorSelector {...props} />);

      const select = screen.getByTestId(AZURE_CLOUD_CONNECTOR_SUPER_SELECT_TEST_SUBJ);
      expect(select).toBeInTheDocument();
    });
  });
});
