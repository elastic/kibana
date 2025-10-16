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
import { getMockPolicyAWS } from '../test/mock';
import { createAwsCloudSetupMock } from '../test/cloud_setup_mocks';
import type { UpdatePolicy } from '../types';

// Mock dependencies
jest.mock('../hooks/use_cloud_setup_context');
jest.mock('./aws_setup_info', () => ({
  AWSSetupInfoContent: ({ info }: { info: React.ReactNode }) => (
    <div data-test-subj="aws-setup-info">{info}</div>
  ),
}));

const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;

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
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(
      createAwsCloudSetupMock({
        shortName: 'CSPM',
        templateName: 'cspm',
      })
    );
  });

  describe('Component Rendering', () => {
    it('renders all essential elements correctly', () => {
      renderWithProviders(defaultProps);

      // AWS setup info should be present with correct content
      const setupInfo = screen.getByTestId('aws-setup-info');
      expect(setupInfo).toBeInTheDocument();
      expect(setupInfo).toHaveTextContent('CSPM');

      // Both setup format radio options should be available
      expect(screen.getByRole('radio', { name: 'CloudFormation' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Manual' })).toBeInTheDocument();

      // Radio buttons should have proper test IDs
      const cloudFormationRadio = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION
      );
      const manualRadio = screen.getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);
      expect(cloudFormationRadio).toBeInTheDocument();
      expect(manualRadio).toBeInTheDocument();
    });
  });

  describe('CloudFormation Setup', () => {
    it('renders CloudFormation setup when CloudFormation format is selected', async () => {
      const propsWithCloudFormation = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              data_stream: defaultProps.input.streams[0].data_stream, // <-- Add this line
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithCloudFormation);

      // Should render CloudFormation setup elements
      expect(screen.getByRole('radio', { name: 'CloudFormation' })).toHaveAttribute('checked');
    });

    it('shows warning when CloudFormation template is not supported', () => {
      const propsWithNoTemplate = {
        ...defaultProps,
        packageInfo: {
          ...defaultProps.packageInfo,
          name: 'test_package_no_template',
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

      renderWithProviders(propsWithNoTemplate);

      expect(
        screen.getByText(/CloudFormation is not supported on the current Integration version/)
      ).toBeInTheDocument();
    });

    it('includes read documentation link in CloudFormation setup', () => {
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

      // Should have a documentation link in the setup info
      expect(screen.getByText('Getting Started')).toBeInTheDocument();
    });
  });

  describe('Manual Setup', () => {
    it('renders manual setup with all essential elements and interactions', () => {
      renderWithProviders(defaultProps);

      // Essential manual setup elements should be present
      expect(screen.getByTestId('aws-credentials-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('externalLink')).toBeInTheDocument();

      // Credential type selector should have proper state
      const selector = screen.getByTestId('aws-credentials-type-selector');
      expect(selector).toHaveValue('direct_access_keys');
      expect(selector).not.toBeDisabled();

      // All credential type options should be available
      expect(screen.getByRole('option', { name: /Direct access keys/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Assume role/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Temporary keys/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /Shared credentials/i })).toBeInTheDocument();
    });

    it('disables credential type selector when disabled prop is true', () => {
      renderWithProviders({ ...defaultProps, disabled: true });

      const selector = screen.getByTestId('aws-credentials-type-selector');
      expect(selector).toBeDisabled();
    });

    it('calls updatePolicy when credential type changes', () => {
      renderWithProviders(defaultProps);

      const selector = screen.getByTestId('aws-credentials-type-selector');
      fireEvent.change(selector, { target: { value: 'assume_role' } });

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'aws.credentials.type': { value: 'assume_role' },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });
  });
});
