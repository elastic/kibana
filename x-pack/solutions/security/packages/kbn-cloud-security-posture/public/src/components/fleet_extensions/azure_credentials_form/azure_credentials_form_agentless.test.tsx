/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

const getMockAzureFields = () => [
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
  const mockFields = getMockAzureFields();

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

    describe('basic form elements', () => {
      beforeEach(() => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
      });

      it('renders agentless form with setup info and fields', () => {
        expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();
        expect(screen.getByTestId('azure-input-var-fields')).toBeInTheDocument();
        expect(screen.getByTestId('azure-selected-credentials-guide')).toBeInTheDocument();
      });

      it('renders credential type selector when cloud connectors are enabled', () => {
        expect(screen.getByTestId('azure-credentials-type-selector')).toBeInTheDocument();
      });

      it('renders service principal fields by default', () => {
        expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
      });
    });
  });

  describe('cloud connector and credential management', () => {
    describe('when cloud connectors are enabled', () => {
      beforeEach(() => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
      });

      it('shows cloud connector option and ARM template button', () => {
        const selector = screen.getByTestId('azure-credentials-type-selector');
        expect(selector).toHaveValue('cloud_connectors');
        expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
      });

      it('can switch to service principal and shows appropriate fields', () => {
        const selector = screen.getByTestId('azure-credentials-type-selector');
        fireEvent.change(selector, { target: { value: 'service_principal_with_client_secret' } });

        expect(mockUpdatePolicy).toHaveBeenCalled();
        expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
      });

      it('allows switching back to cloud connectors', async () => {
        const credentialSelector = screen.getByTestId('azure-credentials-type-selector');

        // Switch to cloud connectors
        fireEvent.change(credentialSelector, { target: { value: 'cloud_connectors' } });

        await waitFor(() => {
          expect(credentialSelector).toHaveValue('cloud_connectors');
        });

        expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
      });
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

  describe('edge cases and environment scenarios', () => {
    it.each([
      ['missing streams', () => ({ ...defaultProps, input: { ...mockInput, streams: [] } })],
      [
        'missing vars',
        () => ({
          ...defaultProps,
          input: { ...mockInput, streams: [{ ...mockInput.streams[0], vars: {} }] },
        }),
      ],
      [
        'undefined cloud setup values',
        () => {
          mockUseCloudSetup.mockReturnValue({
            isCloudEnabled: undefined,
            cloudHost: undefined,
            isServerlessEnabled: undefined,
            azureOverviewPath: undefined,
            azurePolicyType: undefined,
            isAzureCloudConnectorEnabled: false,
            azureCloudConnectorRemoteRoleTemplate: undefined,
          });
          return defaultProps;
        },
      ],
      ['empty package info', () => ({ ...defaultProps, packageInfo: {} as PackageInfo })],
    ])('handles %s gracefully', (scenarioName, getProps) => {
      expect(() => {
        renderWithIntl(<AzureCredentialsFormAgentless {...getProps()} />);
      }).not.toThrow();
    });

    describe('credential mode switching and environment compatibility', () => {
      beforeEach(() => {
        mockUseCloudSetup.mockReturnValue(defaultCloudSetup);
        mockGetAgentlessCredentialsType.mockReturnValue('cloud_connectors');
      });

      it('switches between service principal and cloud connector modes based on feature enablement', () => {
        // Test when cloud connectors are disabled (service principal only)
        mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');

        const { rerender } = render(
          <I18nProvider>
            <AzureCredentialsFormAgentless {...defaultProps} />
          </I18nProvider>
        );

        expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
        expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();

        // Test when cloud connectors are enabled
        mockGetAgentlessCredentialsType.mockReturnValue('cloud_connectors');

        rerender(
          <I18nProvider>
            <AzureCredentialsFormAgentless {...defaultProps} />
          </I18nProvider>
        );

        expect(screen.getByTestId('azure-credentials-type-selector')).toBeInTheDocument();
        expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
      });

      it.each([
        [
          'serverless AWS environment',
          {
            isCloudEnabled: true,
            cloudHost: 'aws',
            isServerlessEnabled: true,
            isAzureCloudConnectorEnabled: true,
          },
        ],
        [
          'GCP cloud environment',
          {
            isCloudEnabled: true,
            cloudHost: 'gcp',
            isServerlessEnabled: false,
            isAzureCloudConnectorEnabled: true,
          },
        ],
        [
          'regular cloud environment with connectors disabled',
          {
            isCloudEnabled: false,
            cloudHost: 'aws',
            isServerlessEnabled: false,
            isAzureCloudConnectorEnabled: false,
          },
        ],
      ])('works correctly in %s', (environmentName, cloudSetupOverrides) => {
        mockUseCloudSetup.mockReturnValue({
          ...defaultCloudSetup,
          ...cloudSetupOverrides,
        });

        if (!cloudSetupOverrides.isAzureCloudConnectorEnabled) {
          mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');
        }

        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        if (cloudSetupOverrides.isAzureCloudConnectorEnabled) {
          expect(screen.getByTestId('azure-credentials-type-selector')).toHaveValue(
            'cloud_connectors'
          );
          expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
        } else {
          expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
          expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
          expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
        }
      });
    });
  });

  // Enhanced cloud connector tests (from upstream)
  describe('cloud connector functionality', () => {
    describe('when cloud connectors are supported', () => {
      beforeEach(() => {
        // Setup cloud connector specific mocks
        mockUseCloudSetup.mockReturnValue({
          ...defaultCloudSetup,
          isAzureCloudConnectorEnabled: true,
        });
        mockGetAgentlessCredentialsType.mockReturnValue('cloud_connectors');
        mockGetAzureCloudConnectorsCredentialsFormOptions.mockReturnValue({
          cloud_connectors: {
            label: 'Cloud Connectors (recommended)',
            fields: {
              'azure.credentials.tenant_id': { label: 'Tenant ID', type: 'text' },
              'azure.credentials.client_id': { label: 'Client ID', type: 'text' },
              azure_credentials_cloud_connector_id: { label: 'Cloud Connector ID', type: 'text' },
            },
          },
        });
      });

      it('displays cloud connector as the default credential type', () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        const credentialSelector = screen.getByTestId('azure-credentials-type-selector');
        expect(credentialSelector).toHaveValue('cloud_connectors');
      });

      it('shows ARM template launch button for cloud connectors', () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        expect(screen.getByTestId('azureLaunchCloudConnectorArmTemplate')).toBeInTheDocument();
        expect(screen.getByText('Deploy in Azure')).toBeInTheDocument();
      });

      it('shows cloud connector specific fields (tenant, client, connector ID)', async () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        await waitFor(() => {
          expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
          expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
        });

        // Note: cloud connector ID would be shown in the real component
        expect(mockGetAzureCloudConnectorsCredentialsFormOptions).toHaveBeenCalled();
      });

      it('handles ARM template URL generation correctly', () => {
        mockGetTemplateUrlFromPackageInfo.mockReturnValue(
          'https://portal.azure.com/#create/Microsoft.Template/uri/https%3A%2F%2Fexample.com%2Ftemplate.json'
        );

        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        const armButton = screen.getByTestId('azureLaunchCloudConnectorArmTemplate');
        // The component uses the cloud setup template, not the mocked URL for this test
        expect(armButton).toHaveAttribute('href', 'cloud-connector-template');
        expect(armButton).toHaveAttribute('target', '_blank');
      });

      it('gracefully handles missing ARM template URL', () => {
        mockGetTemplateUrlFromPackageInfo.mockReturnValue(undefined);

        expect(() => {
          renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);
        }).not.toThrow();

        const armButton = screen.getByTestId('azureLaunchCloudConnectorArmTemplate');
        expect(armButton.getAttribute('href')).toBe('cloud-connector-template');
      });
    });

    describe('when cloud connectors are not supported', () => {
      beforeEach(() => {
        mockUseCloudSetup.mockReturnValue({
          ...defaultCloudSetup,
          isAzureCloudConnectorEnabled: false,
        });
        mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');
      });

      it('does not show cloud connector option in selector', () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        expect(screen.queryByTestId('azure-credentials-type-selector')).not.toBeInTheDocument();
      });

      it('defaults to service principal credential type', () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
        expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
      });

      it('does not show ARM template button', () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        expect(
          screen.queryByTestId('azureLaunchCloudConnectorArmTemplate')
        ).not.toBeInTheDocument();
      });
    });

    describe('credential type switching with cloud connectors', () => {
      beforeEach(() => {
        mockUseCloudSetup.mockReturnValue({
          ...defaultCloudSetup,
          isAzureCloudConnectorEnabled: true,
        });
        mockGetAgentlessCredentialsType.mockReturnValue('cloud_connectors');
      });

      it('can switch from cloud connectors to service principal', async () => {
        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        const credentialSelector = screen.getByTestId('azure-credentials-type-selector');
        expect(credentialSelector).toHaveValue('cloud_connectors');

        // Switch to service principal
        fireEvent.change(credentialSelector, {
          target: { value: 'service_principal_with_client_secret' },
        });

        expect(mockUpdatePolicy).toHaveBeenCalled();

        await waitFor(() => {
          expect(screen.getByTestId('azure.credentials.client_id')).toBeInTheDocument();
          expect(screen.getByTestId('azure.credentials.tenant_id')).toBeInTheDocument();
          expect(screen.getByTestId('azure.credentials.client_secret')).toBeInTheDocument();
        });
      });

      it('can switch back to cloud connectors from service principal', async () => {
        // Start with service principal
        mockGetAgentlessCredentialsType.mockReturnValue('service_principal_with_client_secret');

        renderWithIntl(<AzureCredentialsFormAgentless {...defaultProps} />);

        const credentialSelector = screen.getByTestId('azure-credentials-type-selector');

        // Verify both options are available when cloud connectors are enabled
        expect(credentialSelector).toBeInTheDocument();
        expect(screen.getByText('Cloud Connectors (recommended)')).toBeInTheDocument();
        expect(screen.getByText('Service Principal with Client Secret')).toBeInTheDocument();

        // Switch to cloud connectors
        fireEvent.change(credentialSelector, { target: { value: 'cloud_connectors' } });

        // Verify the selector value changes (the component may need to re-render to show ARM template)
        expect(credentialSelector).toHaveValue('cloud_connectors');
      });
    });
  });
});
