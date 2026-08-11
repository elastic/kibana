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
  GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ,
  GCP_SINGLE_ACCOUNT_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import { ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common';
import { GcpAccountTypeSelect } from './gcp_account_type_selector';
import type { UpdatePolicy } from '../types';

// Mock the cloud setup context
const mockUseCloudSetup = jest.fn();
jest.mock('../hooks/use_cloud_setup_context', () => ({
  useCloudSetup: () => mockUseCloudSetup(),
}));

// Mock the utility functions
jest.mock('../utils', () => ({
  updatePolicyWithInputs: jest.fn(),
  gcpField: {
    fields: {
      'gcp.organization_id': { value: '' },
    },
  },
  getGcpInputVarsFields: jest.fn(),
}));

// Get mocked functions from jest modules
const {
  updatePolicyWithInputs: mockUpdatePolicyWithInputs,
  getGcpInputVarsFields: mockGetGcpInputVarsFields,
} = jest.requireMock('../utils');

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

// Shared GCP mock factories for account type selector tests
const createMockGcpAccountInput = (): NewPackagePolicyInput => ({
  type: 'gcp',
  policy_template: 'cloudbeat/cis_gcp',
  enabled: true,
  streams: [
    {
      enabled: true,
      data_stream: { type: 'logs', dataset: 'cloudbeat.cis_gcp' },
      vars: {
        'gcp.account_type': { value: 'single-account' },
      },
    },
  ],
});

const createMockGcpAccountPackageInfo = (): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    version: '1.6.0',
    title: 'Cloud Security Posture',
    policy_templates: [],
    data_streams: [],
    assets: [],
    owner: { github: 'elastic/security-team' },
  } as unknown as PackageInfo);

const createMockGcpAccountPolicy = (input: NewPackagePolicyInput): NewPackagePolicy =>
  ({
    name: 'test-policy',
    namespace: 'default',
    policy_id: 'policy-123',
    enabled: true,
    inputs: [input],
  } as NewPackagePolicy);

const getDefaultGcpAccountCloudSetup = () => ({
  gcpOrganizationEnabled: true,
  gcpPolicyType: 'cloudbeat/cis_gcp',
  shortName: 'CSPM',
});

describe('GcpAccountTypeSelect', () => {
  const mockUpdatePolicy = jest.fn();
  const mockInput = createMockGcpAccountInput();
  const mockPackageInfo = createMockGcpAccountPackageInfo();
  const mockNewPolicy = createMockGcpAccountPolicy(mockInput);

  const defaultProps = {
    input: mockInput,
    newPolicy: mockNewPolicy,
    updatePolicy: mockUpdatePolicy as UpdatePolicy,
    packageInfo: mockPackageInfo,
    disabled: false,
  };

  const defaultCloudSetup = getDefaultGcpAccountCloudSetup();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(defaultCloudSetup);
    mockUpdatePolicyWithInputs.mockImplementation(
      (
        policy: NewPackagePolicy,
        policyType: string,
        updates: Record<string, { value?: unknown; type?: string }>
      ) => ({
        ...policy,
        inputs: policy.inputs.map((input) => ({
          ...input,
          streams: input.streams.map((stream) => ({
            ...stream,
            vars: {
              ...stream.vars,
              ...updates,
            },
          })),
        })),
      })
    );
    mockGetGcpInputVarsFields.mockReturnValue([
      { id: 'gcp.organization_id', value: 'test-org-id' },
    ]);
  });

  describe('rendering', () => {
    it('renders account type selector with both options when organization is enabled', () => {
      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} />);

      expect(screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ)).toBeInTheDocument();
      expect(screen.getByTestId(GCP_SINGLE_ACCOUNT_TEST_SUBJ)).toBeInTheDocument();
      expect(screen.getByText('GCP Organization')).toBeInTheDocument();
      expect(screen.getByText('Single Project')).toBeInTheDocument();
    });

    it('renders organization option as disabled when organization is not enabled', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        gcpOrganizationEnabled: false,
      });

      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} />);

      const orgButton = screen.getByTestId('gcpOrganizationAccountTestId').closest('button');
      expect(orgButton).toBeDisabled();

      // Check that the tooltip content appears when the organization option is disabled
      // The tooltip should be available via accessibility or data attributes
      const orgElement = screen.getByTestId('gcpOrganizationAccountTestId');
      expect(orgElement).toBeInTheDocument();
    });

    it('shows warning callout when organization is not supported', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        gcpOrganizationEnabled: false,
      });

      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} />);

      expect(
        screen.getByText(/GCP Organization not supported in current integration version/)
      ).toBeInTheDocument();
    });

    it('shows organization description when organization account type is selected', () => {
      const inputWithOrg = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'gcp.account_type': { value: ORGANIZATION_ACCOUNT },
            },
          },
        ],
      };

      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} input={inputWithOrg} />);

      const orgRadio = screen.getByRole('radio', { name: /GCP Organization/ });
      expect(orgRadio).toBeChecked();

      expect(screen.getByText(/Connect Elastic to every GCP Project/)).toBeInTheDocument();
    });

    it('shows single account description when single account type is selected', () => {
      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} />);

      const singleRadio = screen.getByRole('radio', { name: /Single Project/ });
      expect(singleRadio).toBeChecked();

      expect(
        screen.getByText(/Deploying to a single project is suitable for an initial POC/)
      ).toBeInTheDocument();
    });

    it('renders disabled when disabled prop is true', () => {
      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} disabled />);

      // The outer button wrappers should be disabled
      const orgButton = screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ).closest('button');
      const singleButton = screen.getByTestId(GCP_SINGLE_ACCOUNT_TEST_SUBJ).closest('button');
      expect(orgButton).toBeDisabled();
      expect(singleButton).toBeDisabled();
    });
  });

  describe('account type selection', () => {
    it('allows clicking on account type options', () => {
      renderWithIntl(<GcpAccountTypeSelect {...defaultProps} />);

      const orgOption = screen.getByTestId(GCP_ORGANIZATION_ACCOUNT_TEST_SUBJ);
      const singleOption = screen.getByTestId(GCP_SINGLE_ACCOUNT_TEST_SUBJ);

      expect(orgOption).toBeInTheDocument();
      expect(singleOption).toBeInTheDocument();

      // The default input has 'single-account', so clicking organization should trigger an update
      fireEvent.click(orgOption);

      // Verify that updatePolicy was called with organization-account
      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          inputs: expect.arrayContaining([
            expect.objectContaining({
              streams: expect.arrayContaining([
                expect.objectContaining({
                  vars: expect.objectContaining({
                    'gcp.account_type': expect.objectContaining({
                      value: ORGANIZATION_ACCOUNT,
                    }),
                  }),
                }),
              ]),
            }),
          ]),
        }),
      });
    });
  });

  describe('initialization', () => {
    it('handles initialization when no account type is set', () => {
      const inputWithoutType = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {},
          },
        ],
      };

      expect(() => {
        renderWithIntl(<GcpAccountTypeSelect {...defaultProps} input={inputWithoutType} />);
      }).not.toThrow();
    });

    it('handles initialization with different organization settings', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        gcpOrganizationEnabled: false,
      });

      const inputWithoutType = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {},
          },
        ],
      };

      expect(() => {
        renderWithIntl(<GcpAccountTypeSelect {...defaultProps} input={inputWithoutType} />);
      }).not.toThrow();
    });
  });

  describe('field management', () => {
    it('handles field management for different account types', () => {
      const inputWithOrg = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'gcp.account_type': { value: ORGANIZATION_ACCOUNT },
            },
          },
        ],
      };

      expect(() => {
        renderWithIntl(<GcpAccountTypeSelect {...defaultProps} input={inputWithOrg} />);
      }).not.toThrow();

      // The component should render successfully with organization account type
      expect(screen.getByText('GCP Organization')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it.each([
      [
        'missing streams',
        () => {
          mockGetGcpInputVarsFields.mockReturnValue([]);
          return {
            ...defaultProps,
            input: { ...mockInput, streams: [{ ...mockInput.streams[0], vars: undefined }] },
          };
        },
      ],
      [
        'undefined cloud setup values',
        () => {
          mockUseCloudSetup.mockReturnValue({
            gcpOrganizationEnabled: undefined,
            gcpPolicyType: undefined,
            shortName: undefined,
          });
          return defaultProps;
        },
      ],
      [
        'empty package info',
        () => ({ ...defaultProps, packageInfo: null as unknown as PackageInfo }),
      ],
    ])('handles %s gracefully', (scenarioName, getProps) => {
      expect(() => {
        renderWithIntl(<GcpAccountTypeSelect {...getProps()} />);
      }).not.toThrow();
    });
  });
});
