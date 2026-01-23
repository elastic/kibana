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
import { ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common';

import { GcpCredentialsFormAgentless } from './gcp_credentials_form_agentless';

// Mock the hooks and utilities
jest.mock('../hooks/use_cloud_setup_context');
jest.mock('../utils');

jest.mock('../utils', () => ({
  getTemplateUrlFromPackageInfo: jest.fn(),
  updatePolicyWithInputs: jest.fn(),
  gcpField: {
    fields: {
      'gcp.project_id': { label: 'Project ID', type: 'text' },
      'gcp.organization_id': { label: 'Organization ID', type: 'text' },
      'gcp.credentials.json': { label: 'Credentials JSON', type: 'password' },
    },
  },
  getGcpInputVarsFields: jest.fn(),
}));

jest.mock('./gcp_setup_info', () => ({
  GCPSetupInfoContent: ({ isAgentless }: { isAgentless: boolean }) => (
    <div data-test-subj="gcp-setup-info">
      <span data-test-subj="agentless-state">{isAgentless ? 'true' : 'false'}</span>
    </div>
  ),
}));

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
        data-test-subj="agentless-field-change"
        type="button"
        onClick={() => onChange('test.field', 'test-value')}
      >
        {'Change Field'}
      </button>
    </div>
  ),
}));

jest.mock('./gcp_credentials_guide', () => ({
  GoogleCloudShellCredentialsGuide: ({
    isOrganization,
    commandText,
  }: {
    isOrganization: boolean;
    commandText: string;
  }) => (
    <div data-test-subj="gcp-credentials-guide">
      <span data-test-subj="guide-organization-state">{isOrganization ? 'true' : 'false'}</span>
      <span data-test-subj="guide-command-text">{commandText}</span>
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

// Get mocked functions from jest modules
const { useCloudSetup: mockUseCloudSetup } = jest.requireMock('../hooks/use_cloud_setup_context');
const {
  getTemplateUrlFromPackageInfo: mockGetTemplateUrlFromPackageInfo,
  updatePolicyWithInputs: mockUpdatePolicyWithInputs,
  getGcpInputVarsFields: mockGetGcpInputVarsFields,
} = jest.requireMock('../utils');

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

// Shared GCP mock factories for agentless tests
const createMockGcpAgentlessInput = (): NewPackagePolicyInput => ({
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
        'gcp.credentials.json': {
          value: '{"type":"service_account"}',
          type: 'password',
        },
      },
    },
  ],
});

const createMockGcpAgentlessPackageInfo = (): PackageInfo =>
  ({
    name: 'cloud_security_posture',
    version: '1.6.0',
    owner: { github: 'elastic' },
    policy_templates: [
      {
        name: 'cspm',
        inputs: [
          {
            type: 'cloudbeat/cis_gcp',
            vars: {
              cloud_shell_url: {
                value:
                  'https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/elastic/cloudbeat&cloudshell_workspace=deploy/cloud&shellonly=true&cloudshell_tutorial=deploy/cloud/cloud-shell-gcp.md&env_vars=CLOUD_SHELL_DEPLOYMENT_TYPE=cspm,CLOUD_SHELL_CSPM_ACCOUNT_TYPE={{ACCOUNT_TYPE}}',
              },
            },
          },
        ],
      },
    ],
    data_streams: [],
    assets: [],
  } as unknown as PackageInfo);

const createMockGcpAgentlessPolicy = (input: NewPackagePolicyInput): NewPackagePolicy => ({
  name: 'gcp-agentless-test',
  description: 'Test GCP agentless policy',
  namespace: 'default',
  policy_id: 'test-policy-id',
  policy_ids: ['test-policy-id'],
  enabled: true,
  inputs: [input],
});

const getDefaultGcpAgentlessCloudSetup = () => ({
  showCloudTemplates: true,
  templateName: 'cspm',
  gcpPolicyType: 'cloudbeat/cis_gcp',
  gcpOverviewPath: '/app/cloud-security-posture/overview/gcp',
});

const getMockGcpAgentlessFields = () => [
  {
    id: 'gcp.project_id',
    label: 'Project ID',
    type: 'text' as const,
    value: 'test-project',
  },
  {
    id: 'gcp.credentials.json',
    label: 'Credentials JSON',
    type: 'password' as const,
    value: '{"type":"service_account"}',
  },
];

describe('GcpCredentialsFormAgentless', () => {
  const mockUpdatePolicy = jest.fn();
  const mockInput = createMockGcpAgentlessInput();
  const mockPackageInfo = createMockGcpAgentlessPackageInfo();
  const mockNewPolicy = createMockGcpAgentlessPolicy(mockInput);

  const defaultProps = {
    input: mockInput,
    newPolicy: mockNewPolicy,
    updatePolicy: mockUpdatePolicy,
    packageInfo: mockPackageInfo,
    disabled: false,
    hasInvalidRequiredVars: false,
  };

  const defaultCloudSetup = getDefaultGcpAgentlessCloudSetup();
  const mockFields = getMockGcpAgentlessFields();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(defaultCloudSetup);
    mockUpdatePolicyWithInputs.mockImplementation(
      (policy: NewPackagePolicy): NewPackagePolicy => policy
    );
    // Ensure getGcpInputVarsFields always returns an array
    mockGetGcpInputVarsFields.mockReturnValue(mockFields);
    mockGetTemplateUrlFromPackageInfo.mockReturnValue(
      'https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/elastic/cloudbeat&cloudshell_workspace=deploy/cloud&shellonly=true&cloudshell_tutorial=deploy/cloud/cloud-shell-gcp.md&env_vars=CLOUD_SHELL_DEPLOYMENT_TYPE=cspm,CLOUD_SHELL_CSPM_ACCOUNT_TYPE=single-account'
    );
  });

  describe('rendering', () => {
    describe('basic form elements and cloud shell integration', () => {
      beforeEach(() => {
        renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);
      });

      it('renders agentless form with core components', () => {
        expect(screen.getByTestId('gcp-setup-info')).toBeInTheDocument();
        expect(screen.getByTestId('agentless-state')).toHaveTextContent('true');
        expect(screen.getByTestId('gcp-input-var-fields')).toBeInTheDocument();
        expect(screen.getByTestId('read-documentation')).toBeInTheDocument();
      });

      it('renders cloud shell integration when templates are supported', () => {
        expect(screen.getByTestId('launchGoogleCloudShellAgentlessButton')).toBeInTheDocument();
        expect(screen.getByText('Launch Google Cloud Shell')).toBeInTheDocument();

        expect(
          screen.getByTestId('launchGoogleCloudShellAccordianInstructions')
        ).toBeInTheDocument();
        expect(screen.getByText('Steps to Generate GCP Account Credentials')).toBeInTheDocument();
      });
    });

    it('renders warning callout when cloud templates are not supported', () => {
      mockUseCloudSetup.mockReturnValue({
        ...defaultCloudSetup,
        showCloudTemplates: false,
      });

      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

      expect(
        screen.getByText(
          'Launch Cloud Shell for automated credentials not supported in current integration version. Please upgrade to the latest version to enable Launch Cloud Shell for automated credentials.'
        )
      ).toBeInTheDocument();

      expect(screen.queryByTestId('launchGoogleCloudShellAgentlessButton')).not.toBeInTheDocument();
    });

    it('renders form as disabled when disabled prop is true', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} disabled={true} />);

      expect(screen.getByTestId('disabled-state')).toHaveTextContent('true');
    });
  });

  describe('single account setup', () => {
    it('renders single account fields for single account type', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('organization-state')).toHaveTextContent('false');
      expect(mockGetGcpInputVarsFields).toHaveBeenCalled();
    });

    it('generates correct cloud shell URL for single account', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

      const launchButton = screen.getByTestId('launchGoogleCloudShellAgentlessButton');
      expect(launchButton).toHaveAttribute(
        'href',
        'https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/elastic/cloudbeat&cloudshell_workspace=deploy/cloud&shellonly=true&cloudshell_tutorial=deploy/cloud/cloud-shell-gcp.md&env_vars=CLOUD_SHELL_DEPLOYMENT_TYPE=cspm,CLOUD_SHELL_CSPM_single-account=single-account'
      );
    });

    it('renders single account command text in credentials guide', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

      // Click accordion to expand
      const accordion = screen.getByTestId('launchGoogleCloudShellAccordianInstructions');
      fireEvent.click(accordion);

      expect(screen.getByTestId('gcp-credentials-guide')).toBeInTheDocument();
      expect(screen.getByTestId('guide-organization-state')).toHaveTextContent('false');
      expect(screen.getByTestId('guide-command-text')).toHaveTextContent(
        'gcloud config set project <PROJECT_ID> && ./deploy_service_account.sh'
      );
    });
  });

  describe('organization setup', () => {
    const orgInput = {
      ...mockInput,
      streams: [
        {
          ...mockInput.streams[0],
          vars: {
            ...mockInput.streams[0].vars,
            'gcp.account_type': {
              value: ORGANIZATION_ACCOUNT,
              type: 'text',
            },
          },
        },
      ],
    };

    it('generates correct cloud shell URL for organization account', () => {
      mockGetTemplateUrlFromPackageInfo.mockReturnValue(
        'https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/elastic/cloudbeat&cloudshell_workspace=deploy/cloud&shellonly=true&cloudshell_tutorial=deploy/cloud/cloud-shell-gcp.md&env_vars=CLOUD_SHELL_DEPLOYMENT_TYPE=cspm,CLOUD_SHELL_CSPM_ACCOUNT_TYPE=organization-account'
      );

      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} input={orgInput} />);

      const launchButton = screen.getByTestId('launchGoogleCloudShellAgentlessButton');
      expect(launchButton).toHaveAttribute(
        'href',
        'https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/elastic/cloudbeat&cloudshell_workspace=deploy/cloud&shellonly=true&cloudshell_tutorial=deploy/cloud/cloud-shell-gcp.md&env_vars=CLOUD_SHELL_DEPLOYMENT_TYPE=cspm,CLOUD_SHELL_CSPM_organization-account=organization-account'
      );
    });

    it('renders organization command text in credentials guide', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} input={orgInput} />);

      // Click accordion to expand
      const accordion = screen.getByTestId('launchGoogleCloudShellAccordianInstructions');
      fireEvent.click(accordion);

      expect(screen.getByTestId('guide-organization-state')).toHaveTextContent('true');
      expect(screen.getByTestId('guide-command-text')).toHaveTextContent(
        'gcloud config set project <PROJECT_ID> && ORG_ID=<ORG_ID_VALUE> ./deploy_service_account.sh'
      );
    });
  });

  describe('field management', () => {
    it('handles field changes correctly', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

      const changeButton = screen.getByTestId('agentless-field-change');
      fireEvent.click(changeButton);

      expect(mockUpdatePolicy).toHaveBeenCalledWith({
        updatedPolicy: expect.any(Object),
      });
    });

    describe('field filtering by account type', () => {
      it('filters fields correctly for single account', () => {
        renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

        expect(mockGetGcpInputVarsFields).toHaveBeenCalled();
      });

      it('filters fields correctly for organization account', () => {
        const orgInput = {
          ...mockInput,
          streams: [
            {
              ...mockInput.streams[0],
              vars: {
                ...mockInput.streams[0].vars,
                'gcp.account_type': {
                  value: ORGANIZATION_ACCOUNT,
                  type: 'text',
                },
              },
            },
          ],
        };

        renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} input={orgInput} />);

        expect(mockGetGcpInputVarsFields).toHaveBeenCalled();
      });
    });
  });

  describe('cloud shell integration', () => {
    describe('button configuration and behavior', () => {
      it('renders cloud shell button with correct target and icon', () => {
        renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

        const launchButton = screen.getByTestId('launchGoogleCloudShellAgentlessButton');
        expect(launchButton).toHaveAttribute('target', '_blank');
        expect(launchButton.querySelector('[data-euiicon-type="launch"]')).toBeInTheDocument();
      });

      it('handles missing cloud shell URL gracefully', () => {
        mockGetTemplateUrlFromPackageInfo.mockReturnValue(undefined);

        expect(() => {
          renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);
        }).not.toThrow();

        const launchButton = screen.getByTestId('launchGoogleCloudShellAgentlessButton');
        // When cloudShellUrl is undefined, the href attribute is not set (null)
        expect(launchButton.getAttribute('href')).toBeNull();
      });
    });
  });

  describe('documentation', () => {
    it('renders documentation link with correct URL', () => {
      renderWithIntl(<GcpCredentialsFormAgentless {...defaultProps} />);

      expect(screen.getByTestId('read-documentation')).toBeInTheDocument();
      expect(screen.getByTestId('doc-url')).toHaveTextContent(
        '/app/cloud-security-posture/overview/gcp'
      );
    });
  });

  describe('edge cases', () => {
    it.each([
      ['missing streams', () => ({ ...defaultProps, input: { ...mockInput, streams: [] } })],
      [
        'missing vars',
        () => ({
          ...defaultProps,
          input: { ...mockInput, streams: [{ ...mockInput.streams[0], vars: undefined }] },
        }),
      ],
      [
        'undefined cloud setup values',
        () => {
          mockUseCloudSetup.mockReturnValue({
            showCloudTemplates: true,
            templateName: undefined,
            gcpPolicyType: undefined,
            gcpOverviewPath: undefined,
          });
          return defaultProps;
        },
      ],
      ['empty package info', () => ({ ...defaultProps, packageInfo: {} as PackageInfo })],
    ])('handles %s gracefully', (scenarioName, getProps) => {
      expect(() => {
        renderWithIntl(<GcpCredentialsFormAgentless {...getProps()} />);
      }).not.toThrow();
    });
  });
});
