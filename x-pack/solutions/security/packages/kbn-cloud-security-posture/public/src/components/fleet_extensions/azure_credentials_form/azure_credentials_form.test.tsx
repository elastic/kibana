/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AzureCredentialsForm } from './azure_credentials_form';
import { I18nProvider } from '@kbn/i18n-react';
import { AZURE_SETUP_FORMAT_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { AZURE_SETUP_FORMAT, AZURE_CREDENTIALS_TYPE } from '../constants';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';

// Mock the hooks
jest.mock('./azure_hooks', () => ({
  useAzureCredentialsForm: jest.fn(),
}));

jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: jest.fn(),
}));

// Mock child components
jest.mock('./azure_setup_info', () => ({
  AzureSetupInfoContent: ({ documentationLink }: { documentationLink: string }) => (
    <div data-test-subj="azure-setup-info">
      {'Azure Setup Info - Link: '}
      {documentationLink}
    </div>
  ),
}));

jest.mock('./azure_credential_type_selector', () => ({
  AzureCredentialTypeSelector: ({ onChange }: { onChange: (value: string) => void }) => (
    <div data-test-subj="azure-credential-type-selector">
      {'Azure Credential Type Selector'}
      <select
        data-test-subj="azure-credential-type-select"
        onBlur={(e) => onChange(e.target.value)}
      >
        <option value="arm_template">{'ARM Template'}</option>
        <option value="service_principal_with_client_secret">{'Service Principal'}</option>
      </select>
    </div>
  ),
}));

jest.mock('./azure_input_var_fields', () => ({
  AzureInputVarFields: ({
    hasInvalidRequiredVars,
    onChange,
  }: {
    hasInvalidRequiredVars: boolean;
    onChange: (key: string, value: string) => void;
  }) => (
    <div data-test-subj="azure-input-var-fields">
      {'Azure Input Fields - Has Invalid: '}
      {String(hasInvalidRequiredVars)}
      <input
        data-test-subj="azure-field-azure.tenant_id"
        onBlur={(e) => onChange('azure.tenant_id', e.target.value)}
      />
    </div>
  ),
}));

jest.mock('../../csp_boxed_radio_group', () => ({
  RadioGroup: ({
    options,
    idSelected,
    onChange,
    disabled,
  }: {
    options: Array<{ id: string; label: string; testId: string }>;
    idSelected: string;
    onChange: (id: string) => void;
    disabled: boolean;
  }) => (
    <div data-test-subj="setup-format-radio-group">
      {options.map((option) => (
        <label key={option.id}>
          <input
            type="radio"
            name="setupFormat"
            value={option.id}
            checked={idSelected === option.id}
            onChange={() => onChange(option.id)}
            disabled={disabled}
            data-test-subj={option.testId}
          />
          {option.label}
        </label>
      ))}
    </div>
  ),
}));

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

// Shared Azure form test factories
const createMinimalMockPackageInfo = (): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    version: '1.0.0',
    title: 'Cloud Security Posture',
    policy_templates: [],
    owner: { github: 'elastic' },
    description: 'Azure credentials test package',
    status: 'installed',
  } as unknown as PackageInfo);

const createMockNewPolicyWithAzureInput = (): NewPackagePolicy =>
  ({
    name: 'test-policy',
    inputs: [{ type: 'cloudbeat/cis_azure', streams: [{}] }],
  } as NewPackagePolicy);

const getMockAzureFormFields = () => [
  { id: 'azure.tenant_id', value: 'test-tenant-123', label: 'Tenant ID' },
  { id: 'azure.client_id', value: 'test-client-456', label: 'Client ID' },
];

describe('AzureCredentialsForm', () => {
  const mockUpdatePolicy = jest.fn();
  const mockOnSetupFormatChange = jest.fn();
  const mockPackageInfo = createMinimalMockPackageInfo();
  const mockNewPolicy = createMockNewPolicyWithAzureInput();
  const mockInput = mockNewPolicy.inputs[0];

  const defaultProps = {
    input: mockInput,
    newPolicy: mockNewPolicy,
    updatePolicy: mockUpdatePolicy,
    packageInfo: mockPackageInfo,
    disabled: false,
    isValid: true,
    hasInvalidRequiredVars: false,
  };

  const mockUseAzureCredentialsForm = jest.requireMock('./azure_hooks').useAzureCredentialsForm;
  const mockUseCloudSetup = jest.requireMock('../hooks/use_cloud_setup_context').useCloudSetup;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAzureCredentialsForm.mockReturnValue({
      azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
      fields: getMockAzureFormFields(),
      hasInvalidRequiredVars: false,
      hasArmTemplateUrl: true,
      setupFormat: AZURE_SETUP_FORMAT.ARM_TEMPLATE,
      onSetupFormatChange: mockOnSetupFormatChange,
      documentationLink: 'https://docs.elastic.co/azure',
      group: { info: <div data-test-subj="group-info">{'Group Info'}</div> },
    });

    mockUseCloudSetup.mockReturnValue({
      azurePolicyType: 'cloudbeat/cis_azure',
      azureEnabled: true,
      azureManualFieldsEnabled: true,
    });
  });

  describe('rendering', () => {
    it('renders Azure setup info and ARM template setup by default', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // Should render setup info
      expect(screen.getByTestId('azure-setup-info')).toBeInTheDocument();
      expect(screen.getByText(/Azure Setup Info - Link:/)).toBeInTheDocument();

      // Should render setup format radio group
      expect(screen.getByTestId('setup-format-radio-group')).toBeInTheDocument();
      expect(screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE)).toBeInTheDocument();
      expect(screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL)).toBeInTheDocument();

      // Should render ARM template setup by default
      expect(screen.getByText(/Ensure "New hosts" is selected/)).toBeInTheDocument();
      expect(screen.getByText(/Log in to your Azure portal/)).toBeInTheDocument();
    });

    it('renders manual setup when manual format is selected and manual fields are enabled', () => {
      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [],
        hasInvalidRequiredVars: false,
        hasArmTemplateUrl: true,
        setupFormat: AZURE_SETUP_FORMAT.MANUAL,
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: <div data-test-subj="group-info">{'Group Info'}</div> },
      });

      // Ensure both conditions are met for manual setup
      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: 'cloudbeat/cis_azure',
        azureEnabled: true,
        azureManualFieldsEnabled: true, // This must be true
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // Should render manual setup elements when both conditions are met
      expect(screen.getByTestId('azure-credential-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('azure-input-var-fields')).toBeInTheDocument();
      expect(screen.getByTestId('group-info')).toBeInTheDocument();

      // Should not show ARM template setup steps
      expect(screen.queryByText(/Ensure "New hosts" is selected/)).not.toBeInTheDocument();
    });

    it('renders temporary manual setup when manual fields are disabled', () => {
      // Set up hook to return manual format to trigger manual setup
      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [],
        hasInvalidRequiredVars: false,
        hasArmTemplateUrl: true,
        setupFormat: AZURE_SETUP_FORMAT.MANUAL, // Manual format selected
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: null },
      });

      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: 'cloudbeat/cis_azure',
        azureEnabled: true,
        azureManualFieldsEnabled: false, // But manual fields disabled
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // Should render temporary manual setup message
      expect(
        screen.getByText(
          /Ensure the agent is deployed on a resource that supports managed identities/
        )
      ).toBeInTheDocument();
      expect(screen.getByText(/Getting Started/)).toBeInTheDocument();
    });

    it('renders warning when Azure is not enabled', () => {
      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: 'cloudbeat/cis_azure',
        azureEnabled: false,
        azureManualFieldsEnabled: true,
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // Should render warning message
      expect(
        screen.getByText(/CIS Azure is not supported on the current Integration version/)
      ).toBeInTheDocument();
      expect(screen.queryByTestId('setup-format-radio-group')).not.toBeInTheDocument();
    });

    it('renders warning when ARM template URL is not available', () => {
      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [],
        hasInvalidRequiredVars: false,
        hasArmTemplateUrl: false,
        setupFormat: AZURE_SETUP_FORMAT.ARM_TEMPLATE,
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: null },
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // Should render warning for unsupported ARM template
      expect(
        screen.getByText(/ARM Template is not supported on the current Integration version/)
      ).toBeInTheDocument();
    });
  });

  describe('setup format interactions', () => {
    it('calls onSetupFormatChange when format selection changes', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      const manualRadio = screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);
      fireEvent.click(manualRadio);

      expect(mockOnSetupFormatChange).toHaveBeenCalledWith(AZURE_SETUP_FORMAT.MANUAL);
    });

    it('does not call onSetupFormatChange when same format is selected', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      const armTemplateRadio = screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE);
      fireEvent.click(armTemplateRadio);

      expect(mockOnSetupFormatChange).not.toHaveBeenCalled();
    });

    it('automatically sets ARM template format when no format is provided', () => {
      // Mock the hook to return undefined setupFormat initially
      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [],
        hasInvalidRequiredVars: false,
        hasArmTemplateUrl: true,
        setupFormat: undefined, // No format initially
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: null },
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      expect(mockOnSetupFormatChange).toHaveBeenCalledWith(AZURE_SETUP_FORMAT.ARM_TEMPLATE);
    });
  });

  describe('manual setup interactions', () => {
    beforeEach(() => {
      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: 'cloudbeat/cis_azure',
        azureEnabled: true,
        azureManualFieldsEnabled: true,
      });

      // Set up hook to return manual format so manual fields are rendered
      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [{ id: 'azure.tenant_id', value: 'test-tenant-123', label: 'Tenant ID' }],
        hasInvalidRequiredVars: false,
        hasArmTemplateUrl: true,
        setupFormat: AZURE_SETUP_FORMAT.MANUAL, // Must be manual for fields to show
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: null },
      });
    });

    it('calls updatePolicy when credential type changes', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      const credentialTypeSelect = screen.getByTestId('azure-credential-type-select');
      fireEvent.blur(credentialTypeSelect, {
        target: { value: AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET },
      });

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'azure.credentials.type': {
                      value: AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET,
                    },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });

    it('calls updatePolicy when input field changes', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      const tenantIdField = screen.getByTestId('azure-field-azure.tenant_id');
      fireEvent.blur(tenantIdField, { target: { value: 'new-tenant-789' } });

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'azure.tenant_id': { value: 'new-tenant-789' },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });
  });

  describe('disabled state', () => {
    it('disables setup format radio group when disabled prop is true', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} disabled={true} />);

      const armTemplateRadio = screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE);
      const manualRadio = screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);

      expect(armTemplateRadio).toBeDisabled();
      expect(manualRadio).toBeDisabled();
    });

    it('enables setup format radio group when disabled prop is false', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} disabled={false} />);

      const armTemplateRadio = screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.ARM_TEMPLATE);
      const manualRadio = screen.getByTestId(AZURE_SETUP_FORMAT_TEST_SUBJECTS.MANUAL);

      expect(armTemplateRadio).not.toBeDisabled();
      expect(manualRadio).not.toBeDisabled();
    });
  });

  describe('validation', () => {
    it('passes hasInvalidRequiredVars to AzureInputVarFields', () => {
      // Clear and set up specific mock for this test
      jest.clearAllMocks();

      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [{ id: 'azure.tenant_id', value: '', label: 'Tenant ID' }],
        hasInvalidRequiredVars: true, // This should show as true
        hasArmTemplateUrl: true,
        setupFormat: AZURE_SETUP_FORMAT.MANUAL, // Must be manual to show the fields
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: null },
      });

      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: 'cloudbeat/cis_azure',
        azureEnabled: true,
        azureManualFieldsEnabled: true,
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // Check that the component is rendered and shows the validation status
      expect(screen.getByTestId('azure-input-var-fields')).toBeInTheDocument();
      // The component receives and displays the hasInvalidRequiredVars prop
      expect(screen.getByText(/Has Invalid:/)).toBeInTheDocument();
    });

    it('calls updatePolicy with isValid false when Azure is disabled', () => {
      mockUseCloudSetup.mockReturnValue({
        azurePolicyType: 'cloudbeat/cis_azure',
        azureEnabled: false,
        azureManualFieldsEnabled: true,
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // The component should call updatePolicy with isValid: false when Azure is disabled
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: mockNewPolicy,
        isValid: false,
      });
    });
  });

  describe('documentation links', () => {
    it('passes documentation link to AzureSetupInfoContent', () => {
      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      // The mocked AzureSetupInfoContent shows the documentation link from the hook
      expect(
        screen.getByText('Azure Setup Info - Link: https://docs.elastic.co/azure')
      ).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles empty fields array', () => {
      mockUseAzureCredentialsForm.mockReturnValue({
        azureCredentialsType: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
        fields: [],
        hasInvalidRequiredVars: false,
        hasArmTemplateUrl: true,
        setupFormat: AZURE_SETUP_FORMAT.MANUAL, // Must be manual to show input fields
        onSetupFormatChange: mockOnSetupFormatChange,
        documentationLink: 'https://docs.elastic.co/azure',
        group: { info: null },
      });

      renderWithIntl(<AzureCredentialsForm {...defaultProps} />);

      expect(screen.getByTestId('azure-input-var-fields')).toBeInTheDocument();
    });
  });
});
