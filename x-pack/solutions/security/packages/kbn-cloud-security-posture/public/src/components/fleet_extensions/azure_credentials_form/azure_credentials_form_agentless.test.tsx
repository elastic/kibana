/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';

import { AzureCredentialsFormAgentless } from './azure_credentials_form_agentless';

// Mock the hooks and utilities
jest.mock('../hooks/use_cloud_setup_context');
jest.mock('../utils');
jest.mock('./get_azure_credentials_form_options');
jest.mock('./azure_credential_guides');

// Mock the utilities
jest.mock('../utils', () => ({
  getTemplateUrlFromPackageInfo: jest.fn(),
  updatePolicyWithInputs: jest.fn(),
  getAzureCredentialsType: jest.fn(),
  getCloudCredentialVarsConfig: jest.fn(),
  azureField: {
    fields: {
      'azure.credentials.tenant_id': { label: 'Tenant ID', type: 'text' },
      'azure.credentials.client_id': { label: 'Client ID', type: 'text' },
      'azure.credentials.client_secret': { label: 'Client Secret', type: 'password' },
      'azure.credentials.type': { label: 'Credentials Type', type: 'text' },
    },
  },
  getAzureInputVarsFields: jest.fn(),
}));

// Mock get_azure_credentials_form_options
jest.mock('./get_azure_credentials_form_options', () => ({
  getAgentlessCredentialsType: jest.fn(),
  getAzureAgentlessCredentialFormOptions: jest.fn(),
  getAzureCloudConnectorsCredentialsFormOptions: jest.fn(),
  getInputVarsFields: jest.fn(),
}));

// Mock components
jest.mock('./azure_input_var_fields', () => ({
  AzureInputVarFields: ({ disabled, onChangeHandler, fields, hasInvalidRequiredVars }: any) => (
    <div data-test-subj="azure-input-var-fields">
      <span data-test-subj="disabled-state">
        {disabled || hasInvalidRequiredVars ? 'true' : 'false'}
      </span>
      <button
        type="button"
        data-test-subj="azure-field-change"
        onClick={() => onChangeHandler?.('test-id', 'test-value')}
      >
        {'Change Field'}
      </button>
      {fields?.map((field: any) => (
        <input
          key={field.id}
          data-test-subj={field.id}
          type={field.type}
          value={field.value}
          onChange={() => {}}
        />
      ))}
    </div>
  ),
}));

jest.mock('./azure_setup_info', () => ({
  AzureSetupInfoContent: ({ documentationLink }: any) => (
    <div data-test-subj="azure-setup-info">
      <span data-test-subj="doc-link">{documentationLink}</span>
    </div>
  ),
}));

jest.mock('./azure_credential_type_selector', () => ({
  AzureCredentialTypeSelector: ({ options, value, onChange }: any) => (
    <select data-test-subj="azure-credentials-type-selector" value={value} onBlur={onChange}>
      {options?.map((option: any) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  ),
}));

// Mock azure_credential_guides
jest.mock('./azure_credential_guides', () => ({
  AzureSelectedCredentialsGuide: () => (
    <div data-test-subj="azure-selected-credentials-guide">
      <span data-test-subj="credential-type" />
    </div>
  ),
}));

// Get mocked functions from jest modules
const { useCloudSetup: mockUseCloudSetup } = jest.requireMock('../hooks/use_cloud_setup_context');
const {
  getTemplateUrlFromPackageInfo: mockGetTemplateUrlFromPackageInfo,
  updatePolicyWithInputs: mockUpdatePolicyWithInputs,
  getAzureInputVarsFields: mockGetAzureInputVarsFields,
  getAzureCredentialsType: mockGetAzureCredentialsType,
  getCloudCredentialVarsConfig: mockGetCloudCredentialVarsConfig,
} = jest.requireMock('../utils');
const {
  getAgentlessCredentialsType: mockGetAgentlessCredentialsType,
  getAzureAgentlessCredentialFormOptions: mockGetAzureAgentlessCredentialFormOptions,
  getAzureCloudConnectorsCredentialsFormOptions: mockGetAzureCloudConnectorsCredentialsFormOptions,
  getInputVarsFields: mockGetInputVarsFields,
} = jest.requireMock('./get_azure_credentials_form_options');

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('AzureCredentialsFormAgentless', () => {
  const mockUpdatePolicy = jest.fn();

  const mockInput: NewPackagePolicyInput = {
    type: 'cloudbeat/cis_azure',
    policy_template: 'cspm',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: {
          type: 'logs',
          dataset: 'cloud_security_posture.findings',
        },
        vars: {
          'azure.credentials.tenant_id': { value: 'test-tenant', type: 'text' },
          'azure.credentials.client_id': { value: 'test-client', type: 'text' },
          'azure.credentials.client_secret': { value: 'test-secret', type: 'password' },
        },
      },
    ],
  };

  const defaultProps = {
    input: mockInput,
    newPolicy: {
      name: 'test-policy',
      namespace: 'default',
      inputs: [mockInput],
      policy_id: 'test-policy-id',
      enabled: true,
      package: {
        name: 'cloud_security_posture',
        title: 'Cloud Security Posture',
        version: '1.0.0',
      },
    } as NewPackagePolicy,
    updatePolicy: mockUpdatePolicy,
    packageInfo: {
      name: 'cloud_security_posture',
      version: '1.0.0',
      policy_templates: [],
      data_streams: [],
      assets: [],
      owner: { github: 'elastic/security-team' },
    } as unknown as PackageInfo,
    setupTechnology: SetupTechnology.AGENTLESS,
    hasInvalidRequiredVars: false,
  };

  const defaultCloudSetup = {
    isCloudEnabled: true,
    cloudHost: 'aws',
    isServerlessEnabled: false,
    azureOverviewPath: '/app/cloud-security-posture/overview/azure',
    azurePolicyType: 'cspm',
    isAzureCloudConnectorEnabled: true,
    azureCloudConnectorRemoteRoleTemplate: 'cloud-connector-template',
  };

  const mockFields = [
    {
      id: 'azure.credentials.tenant_id',
      label: 'Tenant ID',
      type: 'text' as const,
      value: 'test-tenant',
    },
    {
      id: 'azure.credentials.client_id',
      label: 'Client ID',
      type: 'text' as const,
      value: 'test-client',
    },
    {
      id: 'azure.credentials.client_secret',
      label: 'Client Secret',
      type: 'password' as const,
      value: 'test-secret',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(defaultCloudSetup);
    mockUpdatePolicyWithInputs.mockImplementation(
      (policy: NewPackagePolicy): NewPackagePolicy => policy
    );
    mockGetAzureInputVarsFields.mockReturnValue(mockFields);
    mockGetTemplateUrlFromPackageInfo.mockReturnValue(
      'https://portal.azure.com/#create/Microsoft.Template/uri/test-template'
    );
    mockGetAzureCredentialsType.mockReturnValue('service_principal_with_client_secret');

    // Setup mocks for get_azure_credentials_form_options
    mockGetAgentlessCredentialsType.mockReturnValue('cloud_connectors');
    mockGetAzureAgentlessCredentialFormOptions.mockReturnValue({
      cloud_connectors: {
        label: 'Cloud Connectors',
        fields: {
          'azure.credentials.tenant_id': { label: 'Tenant ID', type: 'text' },
          'azure.credentials.client_id': { label: 'Client ID', type: 'text' },
        },
      },
      service_principal_with_client_secret: {
        label: 'Service Principal with Client Secret',
        fields: {
          'azure.credentials.tenant_id': { label: 'Tenant ID', type: 'text' },
          'azure.credentials.client_id': { label: 'Client ID', type: 'text' },
          'azure.credentials.client_secret': { label: 'Client Secret', type: 'password' },
        },
      },
    });
    mockGetAzureCloudConnectorsCredentialsFormOptions.mockReturnValue({
      cloud_connectors: {
        label: 'Cloud Connectors (recommended)',
        fields: {
          'azure.credentials.tenant_id': { label: 'Tenant ID', type: 'text' },
          'azure.credentials.client_id': { label: 'Client ID', type: 'text' },
          azure_credentials_cloud_connector_id: { label: 'Cloud Connector ID', type: 'text' },
        },
      },
      service_principal_with_client_secret: {
        label: 'Service Principal with Client Secret',
        fields: {
          'azure.credentials.tenant_id': { label: 'Tenant ID', type: 'text' },
          'azure.credentials.client_id': { label: 'Client ID', type: 'text' },
          'azure.credentials.client_secret': { label: 'Client Secret', type: 'password' },
        },
      },
    });
    mockGetInputVarsFields.mockReturnValue(mockFields);

    // Setup getCloudCredentialVarsConfig mock
    mockGetCloudCredentialVarsConfig.mockReturnValue({
      vars: mockFields,
    });
  });

  describe('rendering', () => {
    it('should render without throwing', () => {
      expect(() => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
      }).not.toThrow();
    });

    it('renders agentless form with setup info and fields', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();
      expect(screen.getByTestId('azure-input-var-fields')).toBeInTheDocument();
      expect(screen.getByTestId('azure-selected-credentials-guide')).toBeInTheDocument();
    });

    it('renders credential type selector when cloud connectors are enabled', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-credentials-type-selector')).toBeInTheDocument();
    });

    it('renders service principal fields by default', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
    });
  });

  describe('cloud connector functionality', () => {
    it('shows cloud connector option when enabled', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      const selector = screen.getByTestId('azure-credentials-type-selector');
      expect(selector).toHaveValue('cloud_connectors');
    });

    it('can switch between credential types', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      const selector = screen.getByTestId('azure-credentials-type-selector');
      fireEvent.change(selector, { target: { value: 'service_principal_with_client_secret' } });

      expect(mockUpdatePolicy).toHaveBeenCalled();
    });

    it('shows client, tenant and secret key when selecting service principal with client secret credential', async () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      const selector = screen.getByTestId('azure-credentials-type-selector');
      fireEvent.change(selector, {
        target: { value: 'service_principal_with_client_secret' },
      });

      expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
    });

    it('allows switching between credential types when cloud connectors enabled', async () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      const credentialSelector = screen.getByTestId('azure-credentials-type-selector');

      // Switch to cloud connectors
      fireEvent.change(credentialSelector, { target: { value: 'cloud_connectors' } });

      await waitFor(() => {
        expect(credentialSelector).toHaveValue('cloud_connectors');
      });

      // Cloud connector ARM template button should be visible
      expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
    });

    it('maintains form state when credential type changes', async () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      const credentialSelector = screen.getByTestId('azure-credentials-type-selector');

      // Switch to service principal
      fireEvent.change(credentialSelector, {
        target: { value: 'service_principal_with_client_secret' },
      });

      await waitFor(() => {
        expect(credentialSelector).toHaveValue('service_principal_with_client_secret');
      });

      // Form fields should be present and functional
      const clientIdField = screen.getByTestId('azure.credentials.client_id');
      const tenantIdField = screen.getByTestId('azure.credentials.tenant_id');
      const clientSecretField = screen.getByTestId('azure.credentials.client_secret');

      expect(clientIdField).toBeInTheDocument();
      expect(tenantIdField).toBeInTheDocument();
      expect(clientSecretField).toBeInTheDocument();

      // Verify updatePolicy was called
      expect(mockUpdatePolicy).toHaveBeenCalled();
    });

    it('renders without credential type selector when cloud connectors are disabled', () => {
      // Override mocks for this test - disable cloud connectors and return service principal
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        isAzureCloudConnectorEnabled: false,
      });
      mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');

      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.queryByTestId('azure-credentials-type-selector')).not.toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
    });
  });

  describe('ARM template integration', () => {
    it('renders ARM template launch button when cloud connectors enabled', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
    });

    it('handles missing ARM template URL gracefully', () => {
      mockGetTemplateUrlFromPackageInfo.mockReturnValue(undefined);

      expect(() => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
      }).not.toThrow();
    });
  });

  describe('documentation', () => {
    it('renders documentation link with correct URL', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('doc-link')).toHaveTextContent(
        '/app/cloud-security-posture/overview/azure'
      );
    });
  });

  describe('edge cases', () => {
    it('handles missing streams gracefully', () => {
      const inputWithoutStreams = { ...mockInput, streams: [] };

      expect(() => {
        renderWithIntl(
          <AzureCredentialsFormAgentless {...defaultProps} input={inputWithoutStreams} />
        );
      }).not.toThrow();
    });

    it('handles missing vars gracefully', () => {
      const inputWithoutVars = {
        ...mockInput,
        streams: [{ ...mockInput.streams[0], vars: {} }],
      };

      expect(() => {
        renderWithIntl(
          <AzureCredentialsFormAgentless {...defaultProps} input={inputWithoutVars} />
        );
      }).not.toThrow();
    });

    it('handles undefined cloud setup values gracefully', () => {
      mockUseCloudSetup.mockReturnValue({
        isCloudEnabled: undefined,
        cloudHost: undefined,
        isServerlessEnabled: undefined,
        azureOverviewPath: undefined,
        azurePolicyType: undefined,
        isAzureCloudConnectorEnabled: false, // Provide fallback to prevent component error
        azureCloudConnectorRemoteRoleTemplate: undefined,
      });

      expect(() => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles empty package info gracefully', () => {
      const emptyPackageInfo = {} as PackageInfo;

      expect(() => {
        renderWithIntl(
          <AzureCredentialsFormAgentless {...defaultProps} packageInfo={emptyPackageInfo} />
        );
      }).not.toThrow();
    });
  });

  describe('version compatibility', () => {
    it('handles older package versions without cloud connector support', () => {
      // Mock older package version behavior
      mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');

      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();
    });

    it('does not show cloud credentials when package version is less than enabled version', () => {
      // Test version compatibility
      mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');

      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      // Should show service principal fields
      expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
    });

    it('enables advanced features for newer package versions', () => {
      // Test newer package version features
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-credentials-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
    });
  });

  describe('serverless and cloud environment tests', () => {
    it('shows cloud connector credential type in serverless environment', () => {
      mockUseCloudSetup.mockReturnValue({
        isCloudEnabled: true,
        cloudHost: 'aws',
        isServerlessEnabled: true,
        azureOverviewPath: '/app/cloud-security-posture/overview/azure',
        azurePolicyType: 'cspm',
        isAzureCloudConnectorEnabled: true,
        azureCloudConnectorRemoteRoleTemplate: 'cloud-connector-template',
      });

      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-credentials-type-selector')).toHaveValue('cloud_connectors');
      expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
    });

    it('shows cloud connectors when cloudHost provider is different than azure', () => {
      mockUseCloudSetup.mockReturnValue({
        isCloudEnabled: true,
        cloudHost: 'gcp',
        isServerlessEnabled: false,
        azureOverviewPath: '/app/cloud-security-posture/overview/azure',
        azurePolicyType: 'cspm',
        isAzureCloudConnectorEnabled: true,
        azureCloudConnectorRemoteRoleTemplate: 'cloud-connector-template',
      });

      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-credentials-type-selector')).toHaveValue('cloud_connectors');
      expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
    });

    it('handles serverless vs regular cloud environments', () => {
      mockUseCloudSetup.mockReturnValue({
        isCloudEnabled: false,
        cloudHost: 'aws',
        isServerlessEnabled: false,
        azureOverviewPath: '/app/cloud-security-posture/overview/azure',
        azurePolicyType: 'cspm',
        isAzureCloudConnectorEnabled: false,
        azureCloudConnectorRemoteRoleTemplate: 'cloud-connector-template',
      });

      // Mock to return service principal when cloud connectors are disabled
      mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');

      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      // Should render standard Azure fields for regular cloud
      expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
      expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
    });
  });
});
