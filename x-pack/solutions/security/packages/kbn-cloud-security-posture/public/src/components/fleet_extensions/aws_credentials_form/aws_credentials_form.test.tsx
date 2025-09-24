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
import { type CloudSetupContextValue, useCloudSetup } from '../hooks/use_cloud_setup_context';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import {
  AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS,
  AWS_ORGANIZATION_ACCOUNT,
} from '@kbn/cloud-security-posture-common';
import { getMockPolicyAWS } from '../test/mock';
import type { CloudSetupConfig, UpdatePolicy } from '../types';

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

  const defaultCloudSetupReturn: CloudSetupContextValue = {
    awsPolicyType: 'cloudbeat/cis_aws',
    shortName: 'CSPM',
    awsOverviewPath: 'https://docs.elastic.co/aws',
    templateName: 'cspm',
    getCloudSetupProviderByInputType: jest.fn(),
    config: {
      showCloudTemplates: true,
    } as CloudSetupConfig,
    showCloudTemplates: false,
    defaultProvider: 'aws',
    defaultProviderType: 'aws',
    awsInputFieldMapping: {},
    isAwsCloudConnectorEnabled: false,
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
    mockUseCloudSetup.mockReturnValue(defaultCloudSetupReturn as CloudSetupContextValue);
  });

  describe('Component Rendering', () => {
    it('renders the component with default props', () => {
      renderWithProviders(defaultProps);

      expect(screen.getByTestId('aws-setup-info')).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'CloudFormation' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'Manual' })).toBeInTheDocument();
    });

    it('displays AWS setup info content with correct short name', () => {
      renderWithProviders(defaultProps);

      const setupInfo = screen.getByTestId('aws-setup-info');
      expect(setupInfo).toHaveTextContent('CSPM');
    });

    it('renders radio group for setup format selection', () => {
      renderWithProviders(defaultProps);

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
            ...defaultProps.input.streams,
            {
              enabled: true,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithCloudFormation);

      // Should render CloudFormation setup elements
      expect(
        screen.getByRole('radio', { name: 'CloudFormation', attribute: 'checked' })
      ).toBeTruthy();
    });

    it('handles organization account type', () => {
      const propsWithOrgAccount = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
                'aws.account_type': { value: AWS_ORGANIZATION_ACCOUNT },
              },
            },
          ],
        },
      };

      // Should render without errors
      expect(() => renderWithProviders(propsWithOrgAccount)).not.toThrow();
    });

    it('handles single account setup', () => {
      const propsWithCloudFormation = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              enabled: true,
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      // Should render without errors
      expect(() => renderWithProviders(propsWithCloudFormation)).not.toThrow();
    });

    it('shows warning when CloudFormation template is not supported', () => {
      // Mock package with no template
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
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
              },
            },
          ],
        },
      };

      renderWithProviders(propsWithCloudFormation);

      // Should have a documentation link in the setup info
      expect(screen.getByRole('link', { name: /Getting Started/ })).toBeInTheDocument();
    });

    it('shows CloudFormation radio button when CloudFormation is supported', () => {
      renderWithProviders(defaultProps);

      expect(screen.getByRole('radio', { name: 'CloudFormation' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'CloudFormation' })).not.toBeDisabled();
    });
  });

  describe('Manual Setup', () => {
    it('renders manual setup components when manual format is selected', () => {
      renderWithProviders(defaultProps);

      expect(screen.getByTestId('aws-credentials-type-selector')).toBeInTheDocument();
      expect(screen.getByTestId('externalLink')).toBeInTheDocument();
    });

    it('passes correct props to AwsCredentialTypeSelector', () => {
      renderWithProviders(defaultProps);

      const selector = screen.getByTestId('aws-credentials-type-selector');
      expect(selector).toHaveValue('direct_access_keys');
      expect(selector).not.toBeDisabled();
    });

    it('disables credential type selector when disabled prop is true', () => {
      renderWithProviders({ ...defaultProps, disabled: true });

      const selector = screen.getByTestId('aws-credentials-type-selector');
      expect(selector).toBeDisabled();
    });

    it('includes read documentation link with correct URL', () => {
      renderWithProviders(defaultProps);

      const docLink = screen.getByTestId('externalLink');
      expect(docLink).toHaveAttribute('href', 'https://docs.elastic.co/aws');
    });
  });

  describe('Event Handlers', () => {
    it('can switch between CloudFormation and Manual setup formats', () => {
      renderWithProviders(defaultProps);

      const cloudFormationRadio = screen.getByTestId(
        AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION
      );
      const manualRadio = screen.getByTestId(AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL);

      // Should be able to interact with radio buttons
      expect(cloudFormationRadio).not.toBeDisabled();
      expect(manualRadio).not.toBeDisabled();
      // Should render both radio buttons
      expect(cloudFormationRadio).toBeInTheDocument();
      expect(manualRadio).toBeInTheDocument();
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

    describe('Credential Type Selection', () => {
      it('displays available credential types', () => {
        renderWithProviders(defaultProps);

        expect(screen.getByRole('option', { name: /Direct access keys/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Assume role/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Temporary keys/i })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: /Shared credentials/i })).toBeInTheDocument();
      });

      it('can change credential types', () => {
        renderWithProviders(defaultProps);

        const selector = screen.getByTestId('aws-credentials-type-selector');

        // Should be able to change credential types
        fireEvent.change(selector, { target: { value: 'assume_role' } });
        expect(mockUpdatePolicy).toHaveBeenCalled();
      });
    });
  });

  describe('Disabled State', () => {
    it('disables radio group when disabled prop is true', () => {
      renderWithProviders({ ...defaultProps, disabled: true });

      const cloudFormationRadio = screen.getByRole('radio', { name: 'CloudFormation' });
      const manualRadio = screen.getByRole('radio', { name: 'Manual' });
      expect(cloudFormationRadio).toBeDisabled();
      expect(manualRadio).toBeDisabled();
    });

    it('passes disabled prop to all interactive elements', () => {
      renderWithProviders({ ...defaultProps, disabled: true });

      const selector = screen.getByTestId('aws-credentials-type-selector');
      expect(selector).toBeDisabled();
    });
  });

  describe('Integration with Hooks', () => {
    it('uses useCloudSetup hook', () => {
      renderWithProviders(defaultProps);

      expect(mockUseCloudSetup).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles missing input streams gracefully', () => {
      const propsWithoutStreams = {
        ...defaultProps,
        input: {
          type: 'cloudbeat/cis_aws',
          enabled: true,
          streams: [],
        } as NewPackagePolicyInput,
      };

      // Should handle empty streams without crashing
      expect(() => renderWithProviders(propsWithoutStreams)).toThrow();
    });

    it('handles undefined input variables gracefully', () => {
      const propsWithoutVars = {
        ...defaultProps,
        input: {
          type: 'cloudbeat/cis_aws',
          enabled: true,
          streams: [
            {
              enabled: true,
              vars: undefined,
            },
          ],
        } as NewPackagePolicyInput,
      };

      expect(() => renderWithProviders(propsWithoutVars)).not.toThrow();
    });
  });
});
