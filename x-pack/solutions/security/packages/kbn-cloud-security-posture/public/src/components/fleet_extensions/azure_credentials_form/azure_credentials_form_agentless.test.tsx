/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';

import { AzureCredentialsFormAgentless } from './azure_credentials_form_agentless';

// Mock functions
const mockCloudConnectorSetup = jest.fn(() => (
  <div data-test-subj="azureLaunchCloudConnectorArmTemplate" />
));

// Mock the hooks and utilities
jest.mock('../hooks/use_cloud_setup_context');
jest.mock('../utils');
jest.mock('./get_azure_credentials_form_options');

// Mock CloudConnectorSetup component
jest.mock('../cloud_connector/cloud_connector_setup', () => ({
  CloudConnectorSetup: (props: unknown) => mockCloudConnectorSetup(),
}));

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
  AzureInputVarFields: ({
    disabled,
    onChangeHandler,
    fields,
    hasInvalidRequiredVars,
  }: {
    disabled?: boolean;
    onChangeHandler?: (id: string, value: string) => void;
    fields?: Array<{ id: string; type: string; value: string }>;
    hasInvalidRequiredVars?: boolean;
  }) => (
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
      {fields?.map((field: { id: string; type: string; value: string }) => (
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
  AzureSetupInfoContent: ({ documentationLink }: { documentationLink?: string }) => (
    <div data-test-subj="azure-setup-info">
      <span data-test-subj="doc-link">{documentationLink}</span>
    </div>
  ),
}));

jest.mock('./azure_credential_type_selector', () => ({
  AzureCredentialTypeSelector: ({
    options,
    value,
    onChange,
  }: {
    options?: Array<{ value: string; text: string }>;
    value?: string;
    onChange?: (event: React.FocusEvent<HTMLSelectElement>) => void;
  }) => (
    <select data-test-subj="azure-credentials-type-selector" value={value} onBlur={onChange}>
      {options?.map((option: { value: string; text: string }) => (
        <option key={option.value} value={option.value}>
          {option.text}
        </option>
      ))}
    </select>
  ),
}));

// Get mocked functions from jest modules
const { useCloudSetup: mockUseCloudSetup } = jest.requireMock('../hooks/use_cloud_setup_context');
const {
  getAgentlessCredentialsType: mockGetAgentlessCredentialsType,
  getAzureAgentlessCredentialFormOptions: mockGetAzureAgentlessCredentialFormOptions,
  getAzureCloudConnectorsCredentialsFormOptions: mockGetAzureCloudConnectorsCredentialsFormOptions,
  getInputVarsFields: mockGetInputVarsFields,
} = jest.requireMock('./get_azure_credentials_form_options');

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

// Shared Azure mock factories for agentless tests
const createMockAzureInput = (): NewPackagePolicyInput => ({
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
});

const createMockAzurePackageInfo = (): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    version: '1.0.0',
    policy_templates: [],
    data_streams: [],
    assets: [],
    owner: { github: 'elastic/security-team' },
  } as unknown as PackageInfo);

const createMockAzurePolicy = (input: NewPackagePolicyInput): NewPackagePolicy =>
  ({
    name: 'test-policy',
    namespace: 'default',
    inputs: [input],
    policy_id: 'test-policy-id',
    enabled: true,
    package: {
      name: 'cloud_security_posture',
      title: 'Cloud Security Posture',
      version: '1.0.0',
    },
  } as NewPackagePolicy);

const getDefaultCloudSetup = () => ({
  isCloudEnabled: true,
  cloudHost: 'aws',
  isServerlessEnabled: false,
  azureOverviewPath: '/app/cloud-security-posture/overview/azure',
  azurePolicyType: 'cspm',
  isAzureCloudConnectorEnabled: true,
  azureCloudConnectorRemoteRoleTemplate: 'cloud-connector-template',
});

describe('AzureCredentialsFormAgentless', () => {
  const mockUpdatePolicy = jest.fn();
  const mockInput = createMockAzureInput();
  const mockPackageInfo = createMockAzurePackageInfo();
  const mockNewPolicy = createMockAzurePolicy(mockInput);

  const defaultProps = {
    input: mockInput,
    newPolicy: mockNewPolicy,
    updatePolicy: mockUpdatePolicy,
    packageInfo: mockPackageInfo,
    setupTechnology: SetupTechnology.AGENTLESS,
    hasInvalidRequiredVars: false,
  };

  const defaultCloudSetup = getDefaultCloudSetup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockCloudConnectorSetup.mockClear();
    mockUseCloudSetup.mockReturnValue(defaultCloudSetup);
    mockGetAgentlessCredentialsType.mockReturnValue('cloud_connectors');
    mockGetAzureAgentlessCredentialFormOptions.mockReturnValue({
      cloud_connectors: {
        label: 'Cloud Connectors',
        fields: {},
      },
      service_principal_with_client_secret: {
        label: 'Service Principal with Client Secret',
        fields: {},
      },
    });
    mockGetAzureCloudConnectorsCredentialsFormOptions.mockReturnValue({
      cloud_connectors: {
        label: 'Cloud Connectors',
        fields: {},
      },
      service_principal_with_client_secret: {
        label: 'Service Principal with Client Secret',
        fields: {},
      },
    });
    mockGetInputVarsFields.mockReturnValue([]);
  });
  describe('renders', () => {
    it('cloud connectors form', () => {
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
      expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();
      expect(screen.getByTestId('azure-credentials-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
      expect(screen.queryByTestId('azure-input-var-fields')).not.toBeInTheDocument();
      expect(screen.getByTestId('doc-link')).toHaveTextContent(
        '/app/cloud-security-posture/overview/azure'
      );
    });
    it('without cloud connectors form', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        isAzureCloudConnectorEnabled: false,
      });
      mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');
      renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();
      expect(screen.getByTestId('azure-input-var-fields')).toBeInTheDocument();
      expect(screen.queryByTestId('azure-credentials-type-selector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('azureLaunchCloudConnectorArmTemplate')).not.toBeInTheDocument();

      expect(screen.getByTestId('doc-link')).toHaveTextContent(
        '/app/cloud-security-posture/overview/azure'
      );
    });
  });
});
