/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@kbn/i18n-react';
import { AwsCredentialsForm } from './aws_credentials_form';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { createAwsCloudSetupMock } from '../test/cloud_setup_mocks';
import type { UpdatePolicy } from '../types';
import { createNewPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

// Internal test mocks
const CLOUDBEAT_AWS = 'cloudbeat/cis_aws';
const TEMPLATE_NAME = 'cspm';
const AWS_PROVIDER = 'aws';

const getMockPolicyAWS = (): NewPackagePolicy => {
  const mockPackagePolicy = createNewPackagePolicyMock();

  const awsVarsMock = {
    access_key_id: { type: 'text' },
    secret_access_key: { type: 'password', isSecret: true },
    session_token: { type: 'text' },
    shared_credential_file: { type: 'text' },
    credential_profile_name: { type: 'text' },
    role_arn: { type: 'text' },
    'aws.credentials.type': { value: 'cloud_formation', type: 'text' },
  };

  const dataStream = { type: 'logs', dataset: 'cloud_security_posture.findings' };

  return {
    ...mockPackagePolicy,
    name: 'cloud_security_posture-policy',
    package: {
      name: 'cloud_security_posture',
      title: 'Security Posture Management',
      version: '1.1.1',
    },
    vars: {
      posture: {
        value: TEMPLATE_NAME,
        type: 'text',
      },
      deployment: { value: AWS_PROVIDER, type: 'text' },
    },
    inputs: [
      {
        type: CLOUDBEAT_AWS,
        policy_template: TEMPLATE_NAME,
        enabled: true,
        streams: [
          {
            enabled: true,
            data_stream: dataStream,
            vars: awsVarsMock,
          },
        ],
      },
    ],
  } as NewPackagePolicy;
};

// Mock dependencies
jest.mock('../hooks/use_cloud_setup_context');
jest.mock('./aws_setup_info', () => ({
  AWSSetupInfoContent: jest.fn(({ info }: { info: React.ReactNode }) => (
    <div data-test-subj="aws-setup-info">{info}</div>
  )),
}));
jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: jest.fn(() => <div data-test-subj="aws-credentials-type-selector" />),
}));
jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: jest.fn(() => <div data-test-subj="aws-input-var-fields" />),
}));

const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;
const mockAwsCredentialTypeSelector = jest.requireMock(
  './aws_credential_type_selector'
).AwsCredentialTypeSelector;
const mockAwsInputVarFields = jest.requireMock('./aws_input_var_fields').AwsInputVarFields;
const mockAWSSetupInfoContent = jest.requireMock('./aws_setup_info').AWSSetupInfoContent;

describe('AwsCredentialsForm', () => {
  const mockUpdatePolicy = jest.fn();

  const defaultProps = {
    newPolicy: {
      ...getMockPolicyAWS(),
      enabled: true,
      policy_id: 'test-policy-id',
      description: 'Test policy',
      namespace: 'default',
      package: {
        name: 'aws',
        title: 'AWS',
        version: '1.0.0',
      },
      vars: {},
    } as NewPackagePolicy,
    input: {
      ...getMockPolicyAWS().inputs[0],
      streams: [
        {
          enabled: true,
          data_stream: {
            dataset: 'aws.cloudtrail',
            type: 'logs',
          },
          vars: {
            'aws.credentials.type': { value: 'direct_access_keys' },
            'aws.access_key_id': { value: '' },
            'aws.secret_access_key': { value: '' },
          },
        },
      ],
    },
    updatePolicy: mockUpdatePolicy,
    packageInfo: {
      version: '1.0.0',
      name: 'cloud_security_posture',
    } as PackageInfo,
    disabled: false,
    hasInvalidRequiredVars: false,
    isValid: true,
  };

  interface AwsCredentialsFormTestProps {
    newPolicy: NewPackagePolicy;
    input: NewPackagePolicyInput;
    updatePolicy: jest.MockedFunction<UpdatePolicy>;
    packageInfo: PackageInfo;
    disabled?: boolean;
    hasInvalidRequiredVars?: boolean;
    isValid?: boolean;
  }

  const renderWithProviders = (props: AwsCredentialsFormTestProps) => {
    return render(
      <I18nProvider>
        <AwsCredentialsForm
          {...props}
          disabled={props.disabled ?? false}
          hasInvalidRequiredVars={props.hasInvalidRequiredVars ?? false}
          isValid={props.isValid ?? true}
        />
      </I18nProvider>
    );
  };

  beforeEach(() => {
    mockUpdatePolicy.mockClear();
    mockAwsCredentialTypeSelector.mockClear();
    mockAwsInputVarFields.mockClear();
    mockAWSSetupInfoContent.mockClear();
    mockUseCloudSetup.mockReturnValue(
      createAwsCloudSetupMock({
        shortName: 'CSPM',
        templateName: 'cspm',
      })
    );
  });

  describe('Component Rendering', () => {
    it('renders default', () => {
      renderWithProviders(defaultProps);

      // Verify AWSSetupInfoContent is rendered
      expect(screen.getByTestId('aws-setup-info')).toBeInTheDocument();
      expect(screen.getByText('Getting Started')).toBeInTheDocument();

      // Verify RadioGroup renders both setup format options
      const cloudFormationRadio = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION
      );
      const manualRadio = screen.getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);

      expect(cloudFormationRadio).toBeInTheDocument();
      expect(manualRadio).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'CloudFormation' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Manual' })).toBeInTheDocument();
    });

    it('disables setup format options when disabled prop is true', () => {
      renderWithProviders({ ...defaultProps, disabled: true });

      // Verify both radio buttons are disabled
      expect(screen.getByRole('button', { name: 'CloudFormation' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Manual' })).toBeDisabled();
    });
  });

  describe('CloudFormation Setup', () => {
    it('renders CloudFormation radio as selected when CloudFormation format is selected', () => {
      const propsWithCloudFormation = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              data_stream: defaultProps.input.streams[0].data_stream,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithCloudFormation);

      // Verify CloudFormation radio input is checked
      const cloudFormationRadio = screen
        .getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION)
        .querySelector('input[type="radio"]');
      expect(cloudFormationRadio).toBeChecked();

      // Verify Manual radio input is not checked
      const manualRadio = screen
        .getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL)
        .querySelector('input[type="radio"]');
      expect(manualRadio).not.toBeChecked();
    });

    it('shows warning when CloudFormation template is not supported', () => {
      const propsWithNoCloudFormationTemplates = {
        ...defaultProps,
        packageInfo: {
          ...defaultProps.packageInfo,
          name: 'cloud_security_posture',
          policy_templates: [
            {
              name: 'cspm',
              title: 'CSPM',
              description: 'Cloud Security Posture Management',
              inputs: [
                {
                  type: 'cloudbeat/cis_aws',
                  title: 'AWS CIS',
                  description: 'AWS CIS Benchmark',
                  // No cloud_formation_template var defined
                  vars: [],
                },
              ],
            },
          ],
        },
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              data_stream: defaultProps.input.streams[0].data_stream,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithNoCloudFormationTemplates);

      expect(
        screen.getByText(/CloudFormation is not supported on the current Integration version/)
      ).toBeInTheDocument();
    });

    it('does not render manual setup components when CloudFormation is selected', () => {
      const propsWithCloudFormation = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              data_stream: defaultProps.input.streams[0].data_stream,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithCloudFormation);

      // Manual setup components should not be rendered
      expect(screen.queryByTestId('aws-credentials-type-selector')).not.toBeInTheDocument();
      expect(screen.queryByTestId('aws-input-var-fields')).not.toBeInTheDocument();
    });
  });

  describe('Manual Setup', () => {
    it('renders manual setup components when Manual format is selected', () => {
      renderWithProviders(defaultProps);

      // Verify Manual radio input is checked
      const manualRadio = screen
        .getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL)
        .querySelector('input[type="radio"]');
      expect(manualRadio).toBeChecked();

      // Verify CloudFormation radio input is not checked
      const cloudFormationRadio = screen
        .getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION)
        .querySelector('input[type="radio"]');
      expect(cloudFormationRadio).not.toBeChecked();

      // Verify manual setup child components are rendered
      expect(screen.getByTestId('aws-credentials-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('aws-input-var-fields')).toBeInTheDocument();
      expect(screen.getByTestId('externalLink')).toBeInTheDocument();
    });

    it('does not render CloudFormation setup when Manual is selected', () => {
      renderWithProviders(defaultProps);

      // CloudFormation-specific instructions should not be present
      expect(screen.queryByText(/Ensure "New hosts" is selected/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Click the Save and continue button/i)).not.toBeInTheDocument();
    });

    it('renders ReadDocumentation component', () => {
      renderWithProviders(defaultProps);

      // Verify ReadDocumentation link is rendered
      expect(screen.getByTestId('externalLink')).toBeInTheDocument();
    });
  });

  describe('Setup Format Switching', () => {
    // Verify updatePolicy is called (component would re-render with new state in real scenario)
    it('updates policy with cloud_formation credential type when switching from Manual to CloudFormation', () => {
      renderWithProviders(defaultProps);

      // Click CloudFormation radio
      const cloudFormationRadio = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION
      );
      fireEvent.click(cloudFormationRadio);

      // Verify updatePolicy was called with cloud_formation credential type
      expect(mockUpdatePolicy).toHaveBeenCalled();
      const updateCall = mockUpdatePolicy.mock.calls[0][0];
      expect(updateCall.updatedPolicy.inputs[0].streams[0].vars['aws.credentials.type']).toEqual({
        value: 'cloud_formation',
        type: 'text',
      });
    });

    it('updates policy with direct_access_keys credential type when switching from CloudFormation to Manual', () => {
      const propsWithCloudFormation = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              data_stream: defaultProps.input.streams[0].data_stream,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithCloudFormation);

      // Click Manual radio
      const manualRadio = screen.getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
      fireEvent.click(manualRadio);

      // Verify updatePolicy was called with assume_role credential type (default manual type when switching from CloudFormation)
      // When switching from CloudFormation to Manual, it sets assume_role as the default instead of direct_access_keys
      expect(mockUpdatePolicy).toHaveBeenCalled();
      const updateCall = mockUpdatePolicy.mock.calls[mockUpdatePolicy.mock.calls.length - 1][0];
      expect(updateCall.updatedPolicy.inputs[0].streams[0].vars['aws.credentials.type']).toEqual({
        value: 'assume_role',
        type: 'text',
      });
    });

    it('does not call updatePolicy when clicking already selected setup format', () => {
      renderWithProviders(defaultProps);

      mockUpdatePolicy.mockClear();

      // Click Manual radio (already selected)
      const manualRadio = screen.getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
      fireEvent.click(manualRadio);

      // Verify updatePolicy was not called
      expect(mockUpdatePolicy).not.toHaveBeenCalled();
    });
  });

  describe('supports_cloud_connector cleanup for agent-based deployments', () => {
    it('should set supports_cloud_connector to false when rendering CloudFormation form', () => {
      const mockUpdatePolicyFn = jest.fn();
      const mockPolicyWithSupport = {
        ...getMockPolicyAWS(),
        supports_cloud_connector: true, // Start with true (shouldn't be)
        cloud_connector_id: 'some-connector',
      };

      renderWithProviders({
        ...defaultProps,
        newPolicy: mockPolicyWithSupport,
        updatePolicy: mockUpdatePolicyFn,
      });

      expect(mockUpdatePolicyFn).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          supports_cloud_connector: false,
          cloud_connector_id: undefined,
        }),
      });
    });

    it('should set supports_cloud_connector to false when rendering Manual setup form', () => {
      const mockUpdatePolicyFn = jest.fn();
      const mockManualPolicy = {
        ...getMockPolicyAWS(),
        supports_cloud_connector: true,
        cloud_connector_id: 'some-connector',
        inputs: [
          {
            ...getMockPolicyAWS().inputs[0],
            streams: [
              {
                ...getMockPolicyAWS().inputs[0].streams[0],
                vars: {
                  ...getMockPolicyAWS().inputs[0].streams[0].vars,
                  'aws.credentials.type': { value: 'assume_role', type: 'text' },
                },
              },
            ],
          },
        ],
      };

      renderWithProviders({
        ...defaultProps,
        newPolicy: mockManualPolicy,
        updatePolicy: mockUpdatePolicyFn,
      });

      expect(mockUpdatePolicyFn).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          supports_cloud_connector: false,
          cloud_connector_id: undefined,
        }),
      });
    });

    it('should not call updatePolicy when supports_cloud_connector is already false', () => {
      const mockUpdatePolicyFn = jest.fn();
      const mockPolicyWithoutSupport = {
        ...getMockPolicyAWS(),
        supports_cloud_connector: false, // Already correct
      };

      renderWithProviders({
        ...defaultProps,
        newPolicy: mockPolicyWithoutSupport,
        updatePolicy: mockUpdatePolicyFn,
      });

      expect(mockUpdatePolicyFn).not.toHaveBeenCalled();
    });
  });
});
