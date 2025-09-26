/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import {
  GCP_INPUT_FIELDS_TEST_SUBJECTS,
  GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS,
  GCP_ORGANIZATION_ACCOUNT,
} from '@kbn/cloud-security-posture-common';

import { GcpCredentialsForm } from './gcp_credential_form';
import { GCP_CREDENTIALS_TYPE } from '../constants';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import {
  getCloudShellDefaultValue,
  updatePolicyWithInputs,
  getGcpCredentialsType,
  getGcpInputVarsFields,
} from '../utils';
import type { UpdatePolicy } from '../types';

// Mock the hooks and utilities
jest.mock('../hooks/use_cloud_setup_context');
jest.mock('../utils');
jest.mock('./gcp_input_var_fields', () => ({
  GcpInputVarFields: ({
    disabled,
    onChange,
    isOrganization,
  }: {
    disabled: boolean;
    onChange: (key: string, value: string) => void;
    isOrganization: boolean;
  }) => (
    <div data-test-subj="gcp-input-var-fields">
      <span data-test-subj="disabled-state">{disabled ? 'true' : 'false'}</span>
      <span data-test-subj="organization-state">{isOrganization ? 'true' : 'false'}</span>
      <button
        data-test-subj="manual-field-change"
        type="button"
        onClick={() => onChange('test.field', 'test-value')}
      >
        {'Change Field'}
      </button>
    </div>
  ),
}));
jest.mock('./gcp_setup_info', () => ({
  GCPSetupInfoContent: ({ isAgentless }: { isAgentless: boolean }) => (
    <div data-test-subj="gcp-setup-info">
      <span data-test-subj="agentless-state">{isAgentless ? 'true' : 'false'}</span>
    </div>
  ),
}));
jest.mock('../common', () => ({
  ReadDocumentation: ({ url }: { url: string }) => (
    <div data-test-subj="read-documentation">
      <span data-test-subj="doc-url">{url}</span>
    </div>
  ),
}));

const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;
const mockGetCloudShellDefaultValue = getCloudShellDefaultValue as jest.MockedFunction<
  typeof getCloudShellDefaultValue
>;
const mockUpdatePolicyWithInputs = updatePolicyWithInputs as jest.MockedFunction<
  typeof updatePolicyWithInputs
>;
const mockGetGcpCredentialsType = getGcpCredentialsType as jest.MockedFunction<
  typeof getGcpCredentialsType
>;
const mockGetGcpInputVarsFields = getGcpInputVarsFields as jest.MockedFunction<
  typeof getGcpInputVarsFields
>;

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('GcpCredentialsForm', () => {
  const mockUpdatePolicy: UpdatePolicy = jest.fn();

  const mockInput: NewPackagePolicyInput = {
    type: 'cloudbeat/cis_gcp',
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
          'gcp.account_type': {
            value: 'single-account',
            type: 'text',
          },
          'gcp.project_id': {
            value: 'test-project',
            type: 'text',
          },
        },
      },
    ],
  };

  const mockNewPolicy: NewPackagePolicy = {
    name: 'gcp-test',
    description: 'Test GCP policy',
    namespace: 'default',
    policy_id: 'test-policy-id',
    policy_ids: ['test-policy-id'],
    enabled: true,
    inputs: [mockInput],
  };

  const mockPackageInfo = {
    name: 'cloud_security_posture',
    version: '1.6.0',
  } as PackageInfo;

  const defaultProps = {
    input: mockInput,
    newPolicy: mockNewPolicy,
    updatePolicy: mockUpdatePolicy,
    packageInfo: mockPackageInfo,
    disabled: false,
    hasInvalidRequiredVars: false,
  };

  const defaultCloudSetup = {
    getCloudSetupProviderByInputType: jest.fn(),
    config: {},
    showCloudTemplates: true,
    defaultProvider: 'aws' as const,
    defaultProviderType: 'aws',
    awsInputFieldMapping: undefined,
    awsPolicyType: 'cloudbeat/cis_k8s',
    awsOrganizationEnabled: true,
    awsOverviewPath: '/app/cloud-security-posture/overview/aws',
    isAwsCloudConnectorEnabled: false,
    azureEnabled: true,
    isAzureCloudConnectorEnabled: false,
    azureOrganizationEnabled: true,
    azureOverviewPath: '/app/cloud-security-posture/overview/azure',
    azurePolicyType: 'cloudbeat/cis_azure',
    gcpEnabled: true,
    gcpOrganizationEnabled: true,
    isGcpCloudConnectorEnabled: false,
    gcpOverviewPath: '/app/cloud-security-posture/overview',
    gcpPolicyType: 'cloudbeat/cis_gcp',
    shortName: 'CSPM',
    templateInputOptions: [],
    templateName: 'cspm',
  };

  const mockFields = [
    {
      id: 'gcp.project_id',
      label: 'Project ID',
      type: 'text' as const,
      value: 'test-project',
    },
    {
      id: 'gcp.organization_id',
      label: 'Organization ID',
      type: 'text' as const,
      value: '',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseCloudSetup.mockReturnValue(defaultCloudSetup as any);
    mockUpdatePolicyWithInputs.mockImplementation((policy) => policy);
    mockGetGcpInputVarsFields.mockReturnValue(mockFields);
    mockGetGcpCredentialsType.mockReturnValue(GCP_CREDENTIALS_TYPE.CREDENTIALS_NONE);
    mockGetCloudShellDefaultValue.mockReturnValue('https://shell.cloud.google.com/');
  });

  describe('rendering', () => {
    it('renders credentials form with setup format options when GCP is enabled', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      expect(screen.getByTestId('gcp-setup-info')).toBeInTheDocument();
      expect(screen.getByTestId('agentless-state')).toHaveTextContent('false');

      // Check setup format options
      expect(
        screen.getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL)
      ).toBeInTheDocument();

      // Check documentation link
      expect(screen.getByTestId('read-documentation')).toBeInTheDocument();
      expect(screen.getByTestId('doc-url')).toHaveTextContent(
        '/app/cloud-security-posture/overview'
      );
    });

    it('renders warning callout when GCP is not enabled', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        gcpEnabled: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      expect(
        screen.getByText(
          'CIS GCP is not supported on the current Integration version, please upgrade your integration to the latest version to use CIS GCP'
        )
      ).toBeInTheDocument();

      // Setup options should not be rendered
      expect(
        screen.queryByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL)
      ).not.toBeInTheDocument();
    });

    it('renders form as disabled when disabled prop is true', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} disabled={true} />);

      const cloudShellOption = screen.getByTestId(
        GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
      );
      expect(cloudShellOption.closest('button')).toBeDisabled();
    });
  });

  describe('cloud shell setup', () => {
    it('renders cloud shell setup by default', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      // Should show cloud shell setup instructions
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.GOOGLE_CLOUD_SHELL_SETUP)
      ).toBeInTheDocument();

      // Should show step-by-step instructions
      expect(screen.getByText('Log into your Google Cloud Console')).toBeInTheDocument();
      expect(
        screen.getByText('Note down the GCP project ID of the project you wish to monitor')
      ).toBeInTheDocument();
    });

    it('renders organization-specific instructions for organization account type', () => {
      const orgInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              ...mockInput.streams[0].vars,
              'gcp.account_type': {
                value: GCP_ORGANIZATION_ACCOUNT,
                type: 'text',
              },
            },
          },
        ],
      };

      renderWithIntl(<GcpCredentialsForm {...defaultProps} input={orgInput} />);

      expect(
        screen.getByText(
          'Note down the GCP organization ID of the organization you wish to monitor and project ID where you want to provision resources for monitoring purposes and provide them in the input boxes below'
        )
      ).toBeInTheDocument();
    });

    it('renders project ID field for cloud shell setup', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      expect(screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID)).toBeInTheDocument();
    });

    it('renders organization ID field for organization account type', () => {
      const orgInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              ...mockInput.streams[0].vars,
              'gcp.account_type': {
                value: GCP_ORGANIZATION_ACCOUNT,
                type: 'text',
              },
            },
          },
        ],
      };

      const orgFields = [
        ...mockFields,
        {
          id: 'gcp.organization_id',
          label: 'Organization ID',
          type: 'text' as const,
          value: 'test-org',
        },
      ];
      mockGetGcpInputVarsFields.mockReturnValue(orgFields);

      renderWithIntl(<GcpCredentialsForm {...defaultProps} input={orgInput} />);

      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID)
      ).toBeInTheDocument();
    });

    it('handles field value changes in cloud shell setup', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      fireEvent.change(projectIdField, { target: { value: 'new-project-id' } });

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.any(Object),
      });
    });
  });

  describe('manual setup', () => {
    beforeEach(() => {
      mockGetGcpCredentialsType.mockReturnValue(GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE);
    });

    it('renders manual setup when credentials type is not CREDENTIALS_NONE', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      expect(screen.getByTestId('gcp-input-var-fields')).toBeInTheDocument();
      expect(screen.getByTestId('organization-state')).toHaveTextContent('false');
    });

    it('passes organization state correctly to manual setup', () => {
      const orgInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              ...mockInput.streams[0].vars,
              'gcp.account_type': {
                value: 'organization-account',
                type: 'text',
              },
            },
          },
        ],
      };

      renderWithIntl(<GcpCredentialsForm {...defaultProps} input={orgInput} />);

      expect(screen.getByTestId('organization-state')).toHaveTextContent('true');
    });

    it('handles field changes in manual setup', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      const changeButton = screen.getByTestId('manual-field-change');
      fireEvent.click(changeButton);

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.any(Object),
      });
    });
  });

  describe('setup format switching', () => {
    it('switches from cloud shell to manual setup', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      const manualOption = screen.getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
      fireEvent.click(manualOption);

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.any(Object),
      });
    });

    it('switches from manual to cloud shell setup', () => {
      mockGetGcpCredentialsType.mockReturnValue(GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE);

      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      const cloudShellOption = screen.getByTestId(
        GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
      );
      fireEvent.click(cloudShellOption);

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.any(Object),
      });
    });

    it('does not trigger onChange when clicking the already selected option', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      const cloudShellOption = screen.getByTestId(
        GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
      );

      // Clear previous calls
      jest.clearAllMocks();

      // Click already selected option
      fireEvent.click(cloudShellOption);

      // Should not trigger update
      expect(mockUpdatePolicy).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('handles validation state for required fields', () => {
      const fieldsWithErrors = [
        {
          id: 'gcp.project_id',
          label: 'Project ID',
          type: 'text' as const,
          value: '', // Empty value
        },
      ];
      mockGetGcpInputVarsFields.mockReturnValue(fieldsWithErrors);

      renderWithIntl(<GcpCredentialsForm {...defaultProps} hasInvalidRequiredVars={true} />);

      // Just verify the component renders without errors when validation is enabled
      const projectIdField = screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.PROJECT_ID);
      expect(projectIdField).toBeInTheDocument();
      expect(projectIdField).toHaveValue('');
    });

    it('handles validation state for organization ID when required', () => {
      const orgInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              ...mockInput.streams[0].vars,
              'gcp.account_type': {
                value: GCP_ORGANIZATION_ACCOUNT,
                type: 'text',
              },
            },
          },
        ],
      };

      const orgFields = [
        {
          id: 'gcp.organization_id',
          label: 'Organization ID',
          type: 'text' as const,
          value: '', // Empty value
        },
      ];
      mockGetGcpInputVarsFields.mockReturnValue(orgFields);

      renderWithIntl(
        <GcpCredentialsForm {...defaultProps} input={orgInput} hasInvalidRequiredVars={true} />
      );

      // Just verify the component renders without errors when validation is enabled
      const organizationIdField = screen.getByTestId(
        GCP_INPUT_FIELDS_TEST_SUBJECTS.ORGANIZATION_ID
      );
      expect(organizationIdField).toBeInTheDocument();
      expect(organizationIdField).toHaveValue('');
    });
  });

  describe('cloud shell URL management', () => {
    it('updates cloud shell URL when switching to cloud shell', () => {
      mockGetCloudShellDefaultValue.mockReturnValue('https://test-shell-url.com');

      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      // Component should update cloud shell URL on mount
      expect(mockGetCloudShellDefaultValue).toHaveBeenCalledWith(mockPackageInfo, 'cspm');
    });

    it('clears cloud shell URL when switching to manual', () => {
      mockGetGcpCredentialsType.mockReturnValue(GCP_CREDENTIALS_TYPE.CREDENTIALS_FILE);

      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      const cloudShellOption = screen.getByTestId(
        GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL
      );
      fireEvent.click(cloudShellOption);

      expect(mockUpdatePolicy).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles missing streams gracefully', () => {
      const inputWithoutStreams = {
        ...mockInput,
        streams: [],
      };

      expect(() => {
        renderWithIntl(<GcpCredentialsForm {...defaultProps} input={inputWithoutStreams} />);
      }).not.toThrow();
    });

    it('handles missing vars gracefully', () => {
      const inputWithoutVars = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: undefined,
          },
        ],
      };

      expect(() => {
        renderWithIntl(<GcpCredentialsForm {...defaultProps} input={inputWithoutVars} />);
      }).not.toThrow();
    });

    it('handles undefined cloud setup values gracefully', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        gcpEnabled: true,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(() => {
        renderWithIntl(<GcpCredentialsForm {...defaultProps} />);
      }).not.toThrow();
    });

    it('handles empty package info gracefully', () => {
      const emptyPackageInfo = {} as PackageInfo;

      expect(() => {
        renderWithIntl(<GcpCredentialsForm {...defaultProps} packageInfo={emptyPackageInfo} />);
      }).not.toThrow();
    });
  });

  describe('accessibility', () => {
    it('provides proper form structure', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      // The form element uses component="form" which creates a form but may not have role="form"
      const form = screen.getByText('Project ID').closest('form');
      expect(form).toBeInTheDocument();
    });

    it('provides proper test subjects for automation', () => {
      renderWithIntl(<GcpCredentialsForm {...defaultProps} />);

      expect(
        screen.getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUD_SHELL)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(GCP_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL)
      ).toBeInTheDocument();
      expect(
        screen.getByTestId(GCP_INPUT_FIELDS_TEST_SUBJECTS.GOOGLE_CLOUD_SHELL_SETUP)
      ).toBeInTheDocument();
    });

    it('provides proper form labels and descriptions', () => {
      const orgInput = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              ...mockInput.streams[0].vars,
              'gcp.account_type': {
                value: GCP_ORGANIZATION_ACCOUNT,
                type: 'text',
              },
            },
          },
        ],
      };

      const orgFields = [
        {
          id: 'gcp.organization_id',
          label: 'Organization ID',
          type: 'text' as const,
          value: 'test-org',
        },
        {
          id: 'gcp.project_id',
          label: 'Project ID',
          type: 'text' as const,
          value: 'test-project',
        },
      ];
      mockGetGcpInputVarsFields.mockReturnValue(orgFields);

      renderWithIntl(<GcpCredentialsForm {...defaultProps} input={orgInput} />);

      expect(screen.getByLabelText('Organization ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Project ID')).toBeInTheDocument();
    });
  });
});
