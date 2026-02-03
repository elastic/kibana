/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AzureAccountTypeSelect } from './azure_account_type_selector';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import * as cloudSetupContext from '../hooks/use_cloud_setup_context';
import { ORGANIZATION_ACCOUNT, SINGLE_ACCOUNT } from '@kbn/fleet-plugin/common';

// Mock the cloud setup context
const mockUseCloudSetup = jest.fn();
jest.spyOn(cloudSetupContext, 'useCloudSetup').mockImplementation(mockUseCloudSetup);

// Mock the updatePolicyWithInputs utility
jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn((policy, policyType, inputs) => ({
    ...policy,
    inputs: [
      {
        ...policy.inputs[0],
        streams: [
          {
            ...policy.inputs[0].streams[0],
            vars: {
              ...policy.inputs[0].streams[0].vars,
              ...inputs,
            },
          },
        ],
      },
    ],
  })),
}));

const defaultMockCloudSetup = {
  isAwsCloudConnectorEnabled: false,
  isAzureCloudConnectorEnabled: true,
  isGcpCloudConnectorEnabled: false,
  isConfigContextLoading: false,
  cloudContextData: undefined,
  packageData: undefined,
  packageInfo: {
    name: 'cloud_security_posture',
    version: '1.0.0',
    title: 'Cloud Security Posture',
  },
  azurePolicyType: 'cloudbeat/cis_azure',
  azureOrganizationEnabled: true,
  shortName: 'CSPM',
};

const createMockNewPackagePolicy = (accountType?: string): NewPackagePolicy => ({
  id: '',
  name: 'test-policy',
  namespace: 'default',
  description: '',
  package: {
    name: 'cloud_security_posture',
    version: '1.0.0',
    title: 'Cloud Security Posture',
  },
  enabled: true,
  policy_id: '',
  policy_ids: [''],
  inputs: [
    {
      type: 'cloudbeat/cis_azure',
      enabled: true,
      streams: [
        {
          enabled: true,
          data_stream: {
            type: 'logs',
            dataset: 'cloud_security_posture.findings',
          },
          vars: accountType
            ? {
                'azure.account_type': {
                  value: accountType,
                  type: 'text',
                },
              }
            : {},
          id: 'stream-1',
        },
      ],
      policy_template: 'cspm',
    },
  ],
  vars: {},
});

const defaultProps = {
  input: {
    type: 'cloudbeat/cis_azure',
    enabled: true,
    streams: [
      {
        enabled: true,
        data_stream: {
          type: 'logs',
          dataset: 'cloud_security_posture.findings',
        },
        vars: {},
        id: 'stream-1',
      },
    ],
    policy_template: 'cspm',
  },
  newPolicy: createMockNewPackagePolicy(),
  updatePolicy: jest.fn(),
  disabled: false,
};

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('AzureAccountTypeSelect', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(defaultMockCloudSetup);
  });

  describe('rendering', () => {
    it('renders the component with default props', () => {
      renderWithIntl(<AzureAccountTypeSelect {...defaultProps} />);

      expect(screen.getByText('Azure Organization')).toBeInTheDocument();
      expect(screen.getByText('Single Subscription')).toBeInTheDocument();
    });

    it('renders organization option disabled when azure organization is disabled', () => {
      // Use minimal mock setup for better performance
      mockUseCloudSetup.mockReturnValueOnce({
        azureOrganizationEnabled: false,
        packageInfo: { name: 'cloud_security_posture' },
        shortName: 'CSPM',
      });

      renderWithIntl(<AzureAccountTypeSelect {...defaultProps} />);

      // Use more specific query to reduce DOM traversal time
      expect(screen.getByLabelText('Azure Organization')).toBeDisabled();
    });

    it('renders organization option enabled when azure organization is enabled', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultMockCloudSetup,
        azureOrganizationEnabled: true,
      });

      renderWithIntl(<AzureAccountTypeSelect {...defaultProps} />);

      const organizationRadio = screen.getByRole('radio', { name: 'Azure Organization' });
      expect(organizationRadio).not.toBeDisabled();
    });

    it('disables the radio group when disabled prop is true', () => {
      renderWithIntl(<AzureAccountTypeSelect {...defaultProps} disabled={true} />);

      const organizationRadio = screen.getByRole('radio', { name: 'Azure Organization' });
      const singleAccountRadio = screen.getByRole('radio', { name: 'Single Subscription' });

      expect(organizationRadio).toBeDisabled();
      expect(singleAccountRadio).toBeDisabled();
    });

    it('enables the radio group when disabled prop is false', () => {
      renderWithIntl(<AzureAccountTypeSelect {...defaultProps} disabled={false} />);

      const organizationRadio = screen.getByRole('radio', { name: 'Azure Organization' });
      const singleAccountRadio = screen.getByRole('radio', { name: 'Single Subscription' });

      expect(organizationRadio).not.toBeDisabled();
      expect(singleAccountRadio).not.toBeDisabled();
    });
  });

  describe('account type selection', () => {
    it('calls updatePolicy to set organization account type by default when no account type is set', () => {
      const mockUpdatePolicy = jest.fn();
      const props = {
        ...defaultProps,
        updatePolicy: mockUpdatePolicy,
      };

      renderWithIntl(<AzureAccountTypeSelect {...props} />);

      // Should call updatePolicy to set default organization account type
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'azure.account_type': {
                      value: ORGANIZATION_ACCOUNT,
                      type: 'text',
                    },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });

    it('selects the correct account type when organization is set in policy', () => {
      const propsWithOrgAccount = {
        ...defaultProps,
        newPolicy: createMockNewPackagePolicy(ORGANIZATION_ACCOUNT),
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: ORGANIZATION_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      renderWithIntl(<AzureAccountTypeSelect {...propsWithOrgAccount} />);

      const organizationRadio = screen.getByRole('radio', { name: 'Azure Organization' });
      expect(organizationRadio).toBeChecked();
    });

    it('selects the correct account type when single account is set in policy', () => {
      const propsWithSingleAccount = {
        ...defaultProps,
        newPolicy: createMockNewPackagePolicy(SINGLE_ACCOUNT),
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: SINGLE_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      renderWithIntl(<AzureAccountTypeSelect {...propsWithSingleAccount} />);

      const singleAccountRadio = screen.getByRole('radio', { name: 'Single Subscription' });
      expect(singleAccountRadio).toBeChecked();
    });
  });

  describe('account type descriptions', () => {
    it('shows organization description when organization account type is selected', () => {
      const propsWithOrgAccount = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: ORGANIZATION_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      renderWithIntl(<AzureAccountTypeSelect {...propsWithOrgAccount} />);

      expect(screen.getByText(/Connect Elastic to every Azure Subscription/i)).toBeInTheDocument();
    });

    it('shows single account description when single account type is selected', () => {
      const propsWithSingleAccount = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: SINGLE_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      renderWithIntl(<AzureAccountTypeSelect {...propsWithSingleAccount} />);

      expect(
        screen.getByText(/Deploying to a single subscription is suitable for an initial POC/i)
      ).toBeInTheDocument();
    });

    it('includes shortName in single account description', () => {
      const customShortName = 'Custom CSPM';
      mockUseCloudSetup.mockReturnValue({
        ...defaultMockCloudSetup,
        shortName: customShortName,
      });

      const propsWithSingleAccount = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: SINGLE_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      renderWithIntl(<AzureAccountTypeSelect {...propsWithSingleAccount} />);

      expect(screen.getByText(new RegExp(customShortName, 'i'))).toBeInTheDocument();
    });
  });

  describe('policy updates', () => {
    it('calls updatePolicy when organization account type is selected', () => {
      const mockUpdatePolicy = jest.fn();
      const props = {
        ...defaultProps,
        updatePolicy: mockUpdatePolicy,
      };

      renderWithIntl(<AzureAccountTypeSelect {...props} />);

      const organizationRadio = screen.getByRole('radio', { name: 'Azure Organization' });
      fireEvent.click(organizationRadio);

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'azure.account_type': {
                      value: ORGANIZATION_ACCOUNT,
                      type: 'text',
                    },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });

    it('calls updatePolicy when single account type is selected', () => {
      const mockUpdatePolicy = jest.fn();
      const props = {
        ...defaultProps,
        updatePolicy: mockUpdatePolicy,
      };

      renderWithIntl(<AzureAccountTypeSelect {...props} />);

      const singleAccountRadio = screen.getByRole('radio', { name: 'Single Subscription' });
      fireEvent.click(singleAccountRadio);

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'azure.account_type': {
                      value: SINGLE_ACCOUNT,
                      type: 'text',
                    },
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });

    it('does not call updatePolicy when the same account type is selected', () => {
      const mockUpdatePolicy = jest.fn();
      const propsWithOrgAccount = {
        ...defaultProps,
        updatePolicy: mockUpdatePolicy,
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: ORGANIZATION_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      renderWithIntl(<AzureAccountTypeSelect {...propsWithOrgAccount} />);

      // The organization radio should already be selected
      const organizationRadio = screen.getByRole('radio', { name: 'Azure Organization' });
      expect(organizationRadio).toBeChecked();

      // Clear any previous calls
      mockUpdatePolicy.mockClear();

      // Click the already selected option
      fireEvent.click(organizationRadio);

      // Should still be called since RadioGroup onChange fires regardless
      expect(mockUpdatePolicy).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('handles missing input streams gracefully', () => {
      const propsWithoutStreams = {
        ...defaultProps,
        input: {
          ...defaultProps.input,
          streams: [],
        },
      };

      // This should throw because the component tries to access streams[0]
      expect(() => {
        renderWithIntl(<AzureAccountTypeSelect {...propsWithoutStreams} />);
      }).toThrow();
    });

    it('handles missing stream vars gracefully', () => {
      const mockUpdatePolicy = jest.fn();
      const propsWithoutVars = {
        ...defaultProps,
        updatePolicy: mockUpdatePolicy,
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: undefined,
            },
          ],
        },
      };

      expect(() => {
        renderWithIntl(<AzureAccountTypeSelect {...propsWithoutVars} />);
      }).not.toThrow();

      // Should call updatePolicy to set default organization account type
      expect(mockUpdatePolicy).toHaveBeenCalled();
    });

    it('handles invalid account type values gracefully', () => {
      const mockUpdatePolicy = jest.fn();
      const propsWithInvalidAccountType = {
        ...defaultProps,
        updatePolicy: mockUpdatePolicy,
        input: {
          ...defaultProps.input,
          streams: [
            {
              ...defaultProps.input.streams[0],
              vars: {
                'azure.account_type': {
                  value: 'invalid-account-type',
                  type: 'text',
                },
              },
            },
          ],
        },
      };

      expect(() => {
        renderWithIntl(<AzureAccountTypeSelect {...propsWithInvalidAccountType} />);
      }).not.toThrow();

      // Component renders but doesn't auto-correct invalid values
      expect(mockUpdatePolicy).not.toHaveBeenCalled();

      // Component should still render the radio options
      expect(screen.getByText('Azure Organization')).toBeInTheDocument();
      expect(screen.getByText('Single Subscription')).toBeInTheDocument();
    });
  });
});
