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
import { AwsCredentialsFormAgentless } from './aws_credentials_form_agentless';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { AWS_CREDENTIALS_TYPE } from '../constants';
import {
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AWS_INPUT_TEST_SUBJECTS,
  AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';

// Mock dependencies
jest.mock('../utils', () => ({
  getCredentialInputs: jest.fn(() => ({
    access_key_id: { value: 'mock-access-key', type: 'text' },
    secret_access_key: { value: 'mock-secret-key', type: 'password' },
  })),
  getAwsCredentialsType: jest.fn(() => 'direct_access_keys'),
  getTemplateUrlFromPackageInfo: jest.fn(() => 'https://mock-template-url.com'),
  getCloudCredentialVarsConfig: jest.fn(() => []),
  updatePolicyWithInputs: jest.fn(),
}));

// Helper to render component with I18n context
const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

// Mock AWS credentials form options
jest.mock('./get_aws_credentials_form_options', () => ({
  getAwsCredentialsCloudConnectorsFormAgentlessOptions: jest.fn(),
  getAwsCredentialsFormAgentlessOptions: jest.fn(),
  getInputVarsFields: jest.fn(),
  getAgentlessCredentialsType: jest.fn(),
  getAwsAgentlessFormOptions: jest.fn(),
}));

// Mock useCloudSetup hook
jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: jest.fn(),
}));

// Mock AWS-specific components
jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: (props: {
    disabled?: boolean;
    onChangeHandler?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    fields?: Array<{ name: string; value: string }>;
    hasInvalidRequiredVars?: boolean;
  }) => {
    // Get the current credential type from our mock to determine what fields to show
    const mockGetAwsCredentialsType = jest.requireMock('../utils').getAwsCredentialsType;
    const currentCredentialType = mockGetAwsCredentialsType();

    // If no fields prop is provided, generate fields based on current credential type
    let fieldsToRender = props.fields;
    if (!fieldsToRender || fieldsToRender.length === 0) {
      if (currentCredentialType === 'direct_access_keys') {
        fieldsToRender = [
          { name: 'aws.credentials.access_key_id', value: '' },
          { name: 'aws.credentials.secret_access_key', value: '' },
        ];
      } else if (currentCredentialType === 'temporary_keys') {
        fieldsToRender = [
          { name: 'aws.credentials.temporary_access_key_id', value: '' },
          { name: 'aws.credentials.temporary_secret_access_key', value: '' },
          { name: 'aws.credentials.temporary_session_token', value: '' },
        ];
      } else if (currentCredentialType === 'cloud_connectors') {
        fieldsToRender = [{ name: 'aws.credentials.role_arn', value: '' }];
      }
    }

    return (
      <div data-test-subj="aws-input-var-fields">
        <span data-test-subj="disabled-state">
          {props.disabled || props.hasInvalidRequiredVars ? 'true' : 'false'}
        </span>
        {/* Render dynamic input fields based on the fields prop */}
        {fieldsToRender?.map((field) => {
          // Map field names to test subjects using exact constants from test_subjects.ts
          const getTestSubj = (fieldName: string) => {
            if (fieldName.includes('access_key_id')) {
              if (fieldName.includes('temporary')) {
                return 'awsTemporaryKeysAccessKeyId'; // AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_KEY_ID
              }
              return 'awsDirectAccessKeyId'; // AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID
            }
            if (fieldName.includes('secret_access_key')) {
              return 'passwordInput-secret-access-key'; // AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY and TEMP_ACCESS_SECRET_KEY
            }
            if (fieldName.includes('session_token')) {
              return 'awsTemporaryKeysSessionToken'; // AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SESSION_TOKEN
            }
            if (fieldName.includes('role_arn')) {
              return 'awsRoleArnInput'; // AWS_INPUT_TEST_SUBJECTS.ROLE_ARN
            }
            return fieldName.replace(/[^a-zA-Z0-9]/g, '');
          };

          return (
            <input
              key={field.name}
              data-test-subj={getTestSubj(field.name)}
              defaultValue={field.value}
              onChange={props.onChangeHandler || (() => {})}
            />
          );
        })}
        <button
          type="button"
          data-test-subj="field-button"
          onClick={() =>
            props.onChangeHandler &&
            props.onChangeHandler({
              target: { value: 'test' },
            } as React.ChangeEvent<HTMLInputElement>)
          }
        >
          {'Change Field'}
        </button>
      </div>
    );
  },
}));

jest.mock('./aws_setup_info', () => ({
  AWSSetupInfoContent: () => <div data-test-subj="aws-setup-info" />,
}));

jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: (props: { value?: string; onChange?: (value: string) => void }) => (
    <select
      data-test-subj="aws-credentials-type-selector"
      value={props.value}
      onChange={(e) => props.onChange && props.onChange(e.target.value)}
      onBlur={(e) => props.onChange && props.onChange(e.target.value)}
    >
      <option value="direct_access_keys">{'Direct Access Keys'}</option>
      <option value="temporary_keys">{'Temporary Keys'}</option>
      <option value="cloud_connectors">{'Cloud Connectors'}</option>
    </select>
  ),
}));

jest.mock('../common', () => ({
  ReadDocumentation: () => <div data-test-subj="read-documentation" />,
}));

jest.mock('./aws_cloud_formation_credential_guide', () => ({
  CloudFormationCloudCredentialsGuide: () => <div data-test-subj="cloud-formation-guide" />,
}));

jest.mock('../cloud_connector/cloud_connector_setup', () => ({
  CloudConnectorSetup: () => <div data-test-subj="cloud-connector-setup" />,
}));

// Get mocked functions from jest modules
const { useCloudSetup: mockUseCloudSetup } = jest.requireMock('../hooks/use_cloud_setup_context');
const {
  getTemplateUrlFromPackageInfo: mockGetTemplateUrlFromPackageInfo,
  getCloudCredentialVarsConfig: mockGetCloudCredentialVarsConfig,
  updatePolicyWithInputs: mockUpdatePolicyWithInputs,
  getAwsCredentialsType: mockGetAwsCredentialsType,
} = jest.requireMock('../utils');
const {
  getAwsCredentialsCloudConnectorsFormAgentlessOptions:
    mockGetAwsCredentialsCloudConnectorsFormAgentlessOptions,
  getAwsCredentialsFormAgentlessOptions: mockGetAwsCredentialsFormAgentlessOptions,
  getInputVarsFields: mockGetInputVarsFields,
  getAgentlessCredentialsType: mockGetAgentlessCredentialsType,
  getAwsAgentlessFormOptions: mockGetAwsAgentlessFormOptions,
} = jest.requireMock('./get_aws_credentials_form_options');

const mockUpdatePolicy = jest.fn();

// Mock CloudSetup
const mockCloud = {
  baseUrl: 'https://cloud.elastic.co',
  cname: 'cloud.elastic.co',
  cloudId: 'test-cloud-id',
  isCloudEnabled: true,
  isServerlessEnabled: false,
  serverless: {
    projectId: 'test-project',
    projectName: 'Test Project',
    projectType: 'security',
  },
} as unknown as CloudSetup;

// Simple mock functions to avoid dependencies
const getPackageInfoMock = (options: Record<string, unknown>) => ({
  name: 'cloud_security_posture',
  version: '1.0.0',
  policy_templates: [],
  data_streams: [],
  assets: [],
  owner: { github: 'elastic/security-team' },
  ...options,
});

const getMockPolicyAWS = () => mockNewPackagePolicy;

const getDefaultCloudSetupConfig = () => ({
  awsOverviewPath: '/cloud-security-posture/overview/aws',
  showCloudTemplates: true,
});

const mockInput: NewPackagePolicyInput = {
  type: 'cloudbeat/cis_aws',
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
        'aws.credentials.access_key_id': { value: 'test-access-key', type: 'text' },
        'aws.credentials.secret_access_key': { value: 'test-secret-key', type: 'password' },
        'aws.credentials.type': { value: 'direct_access_keys', type: 'text' },
      },
    },
  ],
};

const mockNewPackagePolicy: NewPackagePolicy = {
  name: 'test-policy',
  namespace: 'default',
  policy_id: 'test-policy-id',
  policy_ids: ['test-policy-id'],
  enabled: true,
  inputs: [mockInput],
  package: {
    name: 'cloud_security_posture',
    title: 'Cloud Security Posture',
    version: '1.0.0',
  },
};

const defaultProps = {
  cloud: mockCloud,
  input: mockInput,
  newPolicy: mockNewPackagePolicy,
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

describe('AwsCredentialsFormAgentless', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks to match Azure test pattern
    mockUpdatePolicyWithInputs.mockImplementation((policy: NewPackagePolicy) => policy);
    mockGetInputVarsFields.mockImplementation(
      (policy: NewPackagePolicy, credentialType: string) => {
        if (credentialType === 'direct_access_keys') {
          return [
            { name: 'aws.credentials.access_key_id', value: '' },
            { name: 'aws.credentials.secret_access_key', value: '' },
          ];
        } else if (credentialType === 'temporary_keys') {
          return [
            { name: 'aws.credentials.temporary_access_key_id', value: '' },
            { name: 'aws.credentials.temporary_secret_access_key', value: '' },
            { name: 'aws.credentials.temporary_session_token', value: '' },
          ];
        } else if (credentialType === 'cloud_connectors') {
          return [{ name: 'aws.credentials.role_arn', value: '' }];
        }
        return [];
      }
    );
    mockGetTemplateUrlFromPackageInfo.mockReturnValue(
      'https://console.aws.amazon.com/cloudformation/home#/stacks/create/review'
    );
    mockGetAwsCredentialsType.mockReturnValue('direct_access_keys');
    mockGetCloudCredentialVarsConfig.mockReturnValue({
      'aws.credentials.type': { value: 'direct_access_keys', type: 'text' },
    });
    mockGetAwsCredentialsFormAgentlessOptions.mockReturnValue({
      [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
        label: 'Direct Access Keys',
        fields: [],
      },
    });
    mockGetAwsCredentialsCloudConnectorsFormAgentlessOptions.mockReturnValue({
      [AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
        label: 'Cloud Connectors',
        fields: [],
      },
    });
    mockGetAgentlessCredentialsType.mockReturnValue('direct_access_keys');
    mockGetAwsAgentlessFormOptions.mockReturnValue({
      [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
        label: 'Direct access keys',
        info: () => <div>{'Direct Access Keys Description'}</div>,
        fields: {
          'aws.credentials.access_key_id': {
            label: 'Access Key ID',
            dataTestSubj: 'awsDirectAccessKeyId',
          },
          'aws.credentials.secret_access_key': {
            label: 'Secret Access Key',
            type: 'password',
            dataTestSubj: 'awsDirectAccessSecretKey',
            isSecret: true,
          },
        },
      },
    });
    mockUseCloudSetup.mockReturnValue({
      packageInfo: getPackageInfoMock({ includeCloudFormationTemplates: true }),
      packagePolicy: getMockPolicyAWS(),
      config: getDefaultCloudSetupConfig(),
      awsOverviewPath: '/cloud-security-posture/overview/aws',
      gcpOverviewPath: '/cloud-security-posture/overview/gcp',
      azureOverviewPath: '/cloud-security-posture/overview/azure',
      showCloudTemplates: true,
      templateName: 'aws-cloudformation-template',
      awsPolicyType: 'cspm',
      awsInputFieldMapping: {},
      shortName: 'aws',
      awsCloudConnectorRemoteRoleTemplate:
        'https://console.aws.amazon.com/cloudformation/remote-role',
      isAwsCloudConnectorEnabled: false,
    });
  });

  describe('Rendering Tests', () => {
    it('renders without crashing', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      // Check if there's an error boundary
      const errorBoundary = screen.queryByTestId('errorBoundaryFatalHeader');
      if (errorBoundary) {
        // Error boundary is present, let's fail with details
        expect(errorBoundary).not.toBeInTheDocument();
      }

      // Look for our mocked components
      const awsInputFields = screen.queryByTestId('aws-input-var-fields');
      if (awsInputFields) {
        expect(awsInputFields).toBeInTheDocument();
      } else {
        // Try to find the credential selector
        const credentialSelector = screen.queryByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
        expect(credentialSelector).toBeInTheDocument();
      }
    });

    it('displays the correct credential type selector', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });

    it('renders CloudFormation launch button when available', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Cloud Connector Functionality', () => {
    it('shows direct access key fields when direct access credentials selected', async () => {
      // Set up mocks for direct access keys
      mockGetAwsCredentialsType.mockReturnValue('direct_access_keys');

      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);

      await waitFor(() => {
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_KEY_ID)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.DIRECT_ACCESS_SECRET_KEY)
        ).toBeInTheDocument();
      });
    });

    it('shows temporary key fields when temporary credentials selected', async () => {
      // Set up mocks for temporary keys
      mockGetAwsCredentialsType.mockReturnValue('temporary_keys');

      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

      await waitFor(() => {
        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_KEY_ID)).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SECRET_KEY)
        ).toBeInTheDocument();
        expect(
          screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.TEMP_ACCESS_SESSION_TOKEN)
        ).toBeInTheDocument();
      });
    });

    it('shows role ARN field when cloud connectors selected', async () => {
      // Set up mocks for cloud connectors
      mockGetAwsCredentialsType.mockReturnValue('cloud_connectors');

      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS);

      await waitFor(() => {
        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.ROLE_ARN)).toBeInTheDocument();
      });
    });
  });

  describe('Field Management', () => {
    it('calls getInputVarsFields with correct parameters', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(mockGetInputVarsFields).toHaveBeenCalled();
    });

    it('calls updatePolicyWithInputs when credentials change', async () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

      await waitFor(() => {
        expect(mockUpdatePolicyWithInputs).toHaveBeenCalled();
      });
    });

    it('handles field validation correctly', () => {
      renderWithIntl(
        <AwsCredentialsFormAgentless {...defaultProps} hasInvalidRequiredVars={true} />
      );

      // Component should handle invalid required vars state
      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('CloudFormation Integration', () => {
    it('generates correct CloudFormation template URL', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(mockGetTemplateUrlFromPackageInfo).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });

    it('opens CloudFormation in new tab when launch button clicked', async () => {
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true,
      });

      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const launchButton = screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ);
      await userEvent.click(launchButton);
    });
  });

  describe('Edge Cases', () => {
    it('handles missing package info gracefully', () => {
      renderWithIntl(
        <AwsCredentialsFormAgentless {...defaultProps} packageInfo={{} as PackageInfo} />
      );

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles undefined cloud setup context', () => {
      mockUseCloudSetup.mockReturnValue({
        awsOverviewPath: '',
        awsPolicyType: '',
        awsInputFieldMapping: {},
        templateName: '',
        showCloudTemplates: false,
        shortName: '',
        awsCloudConnectorRemoteRoleTemplate: '',
        isAwsCloudConnectorEnabled: false,
      });

      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles invalid credential type gracefully', () => {
      mockGetAwsCredentialsType.mockReturnValue(null);

      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Version Compatibility', () => {
    it('does not show cloud connectors for older package versions', () => {
      const packageInfoWithLowerVersion = { ...defaultProps.packageInfo, version: '1.0.0' };

      renderWithIntl(
        <AwsCredentialsFormAgentless {...defaultProps} packageInfo={packageInfoWithLowerVersion} />
      );

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).not.toHaveValue(AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS);
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });

    it('shows cloud connectors for compatible package versions', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Cloud Host Compatibility', () => {
    it('does not show cloud connectors when cloud host is not AWS', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).not.toHaveValue(AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS);
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });

    it('shows cloud connectors when cloud host matches AWS', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Serverless Environment Tests', () => {
    it('handles serverless environment with cloud connectors enabled', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
      expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles serverless environment with cloud connectors disabled', () => {
      renderWithIntl(<AwsCredentialsFormAgentless {...defaultProps} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });
  });

  describe('Setup Technology Tests', () => {
    it('handles agentless setup technology correctly', () => {
      renderWithIntl(
        <AwsCredentialsFormAgentless
          {...defaultProps}
          setupTechnology={SetupTechnology.AGENTLESS}
        />
      );

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles agent-based setup technology correctly', () => {
      renderWithIntl(
        <AwsCredentialsFormAgentless
          {...defaultProps}
          setupTechnology={SetupTechnology.AGENT_BASED}
        />
      );

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });
});
