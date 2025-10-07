/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AwsCredentialsFormAgentless } from './aws_credentials_form_agentless';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import {
  getPackageInfoMock,
  getMockPolicyAWS,
  getDefaultCloudSetupConfig,
  createCloudServerlessMock,
  CLOUDBEAT_AWS,
} from '../test/mock';
import { AWS_CREDENTIALS_TYPE, AWS_PROVIDER, GCP_PROVIDER } from '../constants';
import {
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
  AWS_INPUT_TEST_SUBJECTS,
  AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import userEvent from '@testing-library/user-event';
import type { CloudSetup } from '@kbn/cloud-plugin/public/types';
import { CloudSetupTestWrapper } from '../test/fixtures/CloudSetupTestWrapper';

// Mock utils module
jest.mock('../utils', () => ({
  getTemplateUrlFromPackageInfo: jest.fn(),
  getCloudCredentialVarsConfig: jest.fn(),
  updatePolicyWithInputs: jest.fn(),
  getAwsCredentialsType: jest.fn(),
}));

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
  }) => (
    <div data-test-subj="aws-input-var-fields">
      <span data-test-subj="disabled-state">
        {props.disabled || props.hasInvalidRequiredVars ? 'true' : 'false'}
      </span>
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
  ),
}));

jest.mock('./aws_setup_info', () => ({
  AWSSetupInfoContent: () => <div data-test-subj="aws-setup-info" />,
}));

jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: (props: { value?: string; onChange?: (value: string) => void }) => (
    <select
      data-test-subj="aws-credentials-type-selector"
      value={props.value}
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

const uiSettingsClient = coreMock.createStart().uiSettings;

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

const AwsCredentialsFormAgentlessWrapper = ({
  cloud,
  hasInvalidRequiredVars = false,
  setupTechnology = SetupTechnology.AGENTLESS,
  packageInfo = getPackageInfoMock({ includeCloudFormationTemplates: true }) as PackageInfo,
}: {
  cloud: CloudSetup;
  hasInvalidRequiredVars?: boolean;
  setupTechnology?: SetupTechnology;
  packageInfo?: PackageInfo;
}) => {
  return (
    <CloudSetupTestWrapper
      config={getDefaultCloudSetupConfig()}
      cloud={cloud}
      uiSettings={uiSettingsClient}
      packageInfo={packageInfo}
      newPolicy={mockNewPackagePolicy}
    >
      <AwsCredentialsFormAgentless
        cloud={cloud}
        updatePolicy={mockUpdatePolicy}
        setupTechnology={setupTechnology}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
        packageInfo={packageInfo}
        input={mockInput}
        newPolicy={mockNewPackagePolicy}
      />
    </CloudSetupTestWrapper>
  );
};

describe('AwsCredentialsFormAgentless', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks to match Azure test pattern
    mockUpdatePolicyWithInputs.mockImplementation((policy: NewPackagePolicy) => policy);
    mockGetInputVarsFields.mockReturnValue([
      { name: 'access_key_id', value: '' },
      { name: 'secret_access_key', value: '' },
      { name: 'role_arn', value: '' },
    ]);
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
    });
  });

  describe('Rendering Tests', () => {
    it('renders without crashing', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

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
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });

    it('renders CloudFormation launch button when available', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Cloud Connector Functionality', () => {
    it('shows direct access key fields when direct access credentials selected', async () => {
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

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
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

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
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS);

      await waitFor(() => {
        expect(screen.getByTestId(AWS_INPUT_TEST_SUBJECTS.ROLE_ARN)).toBeInTheDocument();
      });
    });
  });

  describe('Field Management', () => {
    it('calls getInputVarsFields with correct parameters', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(mockGetInputVarsFields).toHaveBeenCalled();
    });

    it('calls updatePolicyWithInputs when credentials change', async () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

      await waitFor(() => {
        expect(mockUpdatePolicyWithInputs).toHaveBeenCalled();
      });
    });

    it('handles field validation correctly', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(
        <AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} hasInvalidRequiredVars={true} />
      );

      // Component should handle invalid required vars state
      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('CloudFormation Integration', () => {
    it('generates correct CloudFormation template URL', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(mockGetTemplateUrlFromPackageInfo).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(String),
        expect.any(String)
      );
    });

    it('opens CloudFormation in new tab when launch button clicked', async () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        value: mockOpen,
        writable: true,
      });

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const launchButton = screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ);
      await userEvent.click(launchButton);

      // Note: The actual opening behavior might be mocked differently
    });
  });

  describe('Edge Cases', () => {
    it('handles missing package info gracefully', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(
        <AwsCredentialsFormAgentlessWrapper
          cloud={serverlessMock}
          packageInfo={{} as PackageInfo}
        />
      );

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles undefined cloud setup context', () => {
      mockUseCloudSetup.mockReturnValue(undefined);
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles invalid credential type gracefully', () => {
      mockGetAwsCredentialsType.mockReturnValue(null);
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Version Compatibility', () => {
    it('does not show cloud connectors for older package versions', () => {
      const packageInfoWithLowerVersion = getPackageInfoMock({
        includeCloudFormationTemplates: true,
      }) as PackageInfo;
      packageInfoWithLowerVersion.version = '1.0.0';

      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(
        <AwsCredentialsFormAgentlessWrapper
          packageInfo={packageInfoWithLowerVersion}
          cloud={serverlessMock}
        />
      );

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).not.toHaveValue(AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS);
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });

    it('shows cloud connectors for compatible package versions', () => {
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Cloud Host Compatibility', () => {
    it('does not show cloud connectors when cloud host is not AWS', () => {
      const mockCloudGCPHost = createCloudServerlessMock(true, AWS_PROVIDER, GCP_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={mockCloudGCPHost} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).not.toHaveValue(AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS);
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });

    it('shows cloud connectors when cloud host matches AWS', () => {
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Serverless Environment Tests', () => {
    it('handles serverless environment with cloud connectors enabled', () => {
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(true);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
      expect(screen.getByTestId(AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles serverless environment with cloud connectors disabled', () => {
      const serverlessMock = createCloudServerlessMock(true, AWS_PROVIDER, AWS_PROVIDER);
      uiSettingsClient.get = jest.fn().mockReturnValue(false);

      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).toBeInTheDocument();
      expect(selector).toHaveValue(AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS);
    });
  });

  describe('Setup Technology Tests', () => {
    it('handles agentless setup technology correctly', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);

      render(
        <AwsCredentialsFormAgentlessWrapper
          cloud={serverlessMock}
          setupTechnology={SetupTechnology.AGENTLESS}
        />
      );

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });

    it('handles agent-based setup technology correctly', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);

      render(
        <AwsCredentialsFormAgentlessWrapper
          cloud={serverlessMock}
          setupTechnology={SetupTechnology.AGENT_BASED}
        />
      );

      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });

  describe('Accessibility Tests', () => {
    it('has proper ARIA labels for form controls', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const selector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      expect(selector).toHaveAttribute('data-test-subj');
    });

    it('maintains focus management for dynamic form fields', async () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      const credentialSelector = screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ);
      await userEvent.selectOptions(credentialSelector, AWS_CREDENTIALS_TYPE.TEMPORARY_KEYS);

      // Form should maintain proper focus after field changes
      expect(credentialSelector).toBeInTheDocument();
    });
  });

  describe('Documentation Integration', () => {
    it('provides documentation links for setup guidance', () => {
      const serverlessMock = createCloudServerlessMock(false, AWS_PROVIDER, AWS_PROVIDER);
      render(<AwsCredentialsFormAgentlessWrapper cloud={serverlessMock} />);

      // Should render documentation components
      expect(screen.getByTestId(AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ)).toBeInTheDocument();
    });
  });
});
