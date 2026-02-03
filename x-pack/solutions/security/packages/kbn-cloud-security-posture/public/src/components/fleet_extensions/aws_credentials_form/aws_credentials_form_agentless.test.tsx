/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { AwsCredentialsFormAgentless } from './aws_credentials_form_agentless';
import type { SetupTechnology } from '@kbn/fleet-plugin/public';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import { createAwsCloudSetupMock } from '../test/cloud_setup_mocks';

// Mock child components - they have their own tests
const mockAwsInputVarFields = jest.fn(() => <div data-test-subj="aws-input-var-fields-mock" />);
const mockAwsCredentialTypeSelector = jest.fn(() => (
  <div data-test-subj="aws-credential-type-selector-mock" />
));
const mockCloudConnectorSetup = jest.fn(() => <div data-test-subj="cloud-connector-setup-mock" />);
const mockAWSSetupInfoContent = jest.fn(() => <div data-test-subj="aws-setup-info-mock" />);

jest.mock('./aws_input_var_fields', () => ({
  AwsInputVarFields: (props: unknown) => mockAwsInputVarFields(),
}));

jest.mock('./aws_credential_type_selector', () => ({
  AwsCredentialTypeSelector: (props: unknown) => mockAwsCredentialTypeSelector(),
}));

// Mock CloudConnectorSetup (lazy loaded from Fleet)
jest.mock('@kbn/fleet-plugin/public', () => ({
  ...jest.requireActual('@kbn/fleet-plugin/public'),
  LazyCloudConnectorSetup: (props: unknown) => mockCloudConnectorSetup(),
}));

jest.mock('./aws_setup_info', () => ({
  AWSSetupInfoContent: (props: unknown) => mockAWSSetupInfoContent(),
}));

jest.mock('../hooks/use_cloud_setup_context');
const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;

const mockPackageInfo = {
  name: 'cloud_security_posture',
  version: '1.0.0',
  title: 'Cloud Security Posture',
  policy_templates: [{ name: 'cspm', title: 'CSPM' }],
} as unknown as PackageInfo;

const mockPackagePolicy = {
  name: 'test-policy',
  namespace: 'default',
  policy_id: 'policy-123',
  inputs: [
    {
      type: 'cloudbeat/cis_aws',
      enabled: true,
      streams: [],
      vars: {
        'aws.credentials.type': { value: 'direct_access_keys' },
      },
    },
  ],
} as unknown as NewPackagePolicy;

const mockInput = {
  type: 'cloudbeat/cis_aws',
  enabled: true,
  streams: [
    {
      id: 'cis_aws-stream-1',
      enabled: true,
      data_stream: { dataset: 'cloud_security_posture.findings', type: 'logs' },
      vars: {
        'aws.account_type': { value: 'single-account' },
        'aws.credentials.type': { value: 'direct_access_keys' },
      },
    },
  ],
} as unknown as NewPackagePolicyInput;

const defaultProps = {
  newPolicy: mockPackagePolicy,
  input: mockInput,
  packageInfo: mockPackageInfo,
  onChange: jest.fn(),
  setupTechnology: 'agentless' as SetupTechnology,
  cloud: cloudMock.createSetup(),
  disabled: false,
  updatePolicy: jest.fn(),
  hasInvalidRequiredVars: false,
};

const renderComponent = (props = {}) => {
  return render(
    <I18nProvider>
      <AwsCredentialsFormAgentless {...defaultProps} {...props} />
    </I18nProvider>
  );
};

describe('AwsCredentialsFormAgentless', () => {
  beforeEach(() => {
    mockAwsInputVarFields.mockClear();
    mockAwsCredentialTypeSelector.mockClear();
    mockCloudConnectorSetup.mockClear();
    mockAWSSetupInfoContent.mockClear();

    mockUseCloudSetup.mockReturnValue(
      createAwsCloudSetupMock({
        shortName: 'Test',
        isAwsCloudConnectorEnabled: false,
      })
    );
  });

  describe('Component integration', () => {
    it('renders default components', () => {
      renderComponent();

      expect(screen.getByTestId('aws-credential-type-selector-mock')).toBeInTheDocument();
      expect(screen.getByTestId('aws-setup-info-mock')).toBeInTheDocument();
      expect(screen.getByTestId('aws-input-var-fields-mock')).toBeInTheDocument();
    });
  });

  describe('Cloud connector integration', () => {
    it('renders CloudConnectorSetup when cloud connectors enabled and credential type is cloud_connectors', () => {
      mockUseCloudSetup.mockReturnValue(
        createAwsCloudSetupMock({
          shortName: 'Test',
          isAwsCloudConnectorEnabled: true,
        })
      );

      const inputWithCloudConnectors = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'aws.account_type': { value: 'single-account' },
              'aws.credentials.type': { value: 'cloud_connectors' },
            },
          },
        ],
      };

      renderComponent({ input: inputWithCloudConnectors });

      const cloudConnector = screen.getByTestId('cloud-connector-setup-mock');
      expect(cloudConnector).toBeInTheDocument();
    });

    it('does not render CloudConnectorSetup when using direct access keys', () => {
      renderComponent();

      const cloudConnector = screen.queryByTestId('cloud-connector-setup-mock');
      expect(cloudConnector).not.toBeInTheDocument();
    });
  });

  describe('CloudFormation integration', () => {
    it('renders CloudFormation button when templates are supported', () => {
      renderComponent();

      expect(screen.getByTestId('launchCloudFormationAgentlessButton')).toBeInTheDocument();
    });

    it('renders CloudFormation warning when templates not supported', () => {
      mockUseCloudSetup.mockReturnValue(
        createAwsCloudSetupMock({
          showCloudTemplates: false,
        })
      );
      renderComponent();

      expect(
        screen.getByText(/Launch Cloud Formation for Automated Credentials not supported/)
      ).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('renders without crashing when packageInfo is undefined', () => {
      expect(() => {
        renderComponent({ packageInfo: undefined });
      }).not.toThrow();
    });

    it('renders without crashing when input vars are undefined', () => {
      expect(() => {
        renderComponent({ input: { ...mockInput, vars: undefined } });
      }).not.toThrow();
    });
  });

  describe('updatePolicyCloudConnectorSupport', () => {
    beforeEach(() => {
      mockUseCloudSetup.mockReturnValue(
        createAwsCloudSetupMock({
          shortName: 'Test',
          isAwsCloudConnectorEnabled: true,
        })
      );
    });

    it('should only set supports_cloud_connector to false when NOT using cloud_connectors', () => {
      const mockUpdatePolicyFn = jest.fn();
      const mockPolicyWithSupport = {
        ...mockPackagePolicy,
        supports_cloud_connector: true,
      };

      const inputWithDirectAccessKeys = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'aws.account_type': { value: 'single-account' },
              'aws.credentials.type': { value: 'direct_access_keys' },
            },
          },
        ],
      };

      renderComponent({
        newPolicy: mockPolicyWithSupport,
        input: inputWithDirectAccessKeys,
        updatePolicy: mockUpdatePolicyFn,
      });

      expect(mockUpdatePolicyFn).toHaveBeenCalledWith({
        updatedPolicy: expect.objectContaining({
          supports_cloud_connector: false,
        }),
      });
    });

    it('should NOT set supports_cloud_connector to true when using cloud_connectors (handled by CloudConnectorSetup)', () => {
      const mockUpdatePolicyFn = jest.fn();
      const mockPolicyWithoutSupport = {
        ...mockPackagePolicy,
        supports_cloud_connector: false, // Start false
      };

      const inputWithCloudConnectors = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'aws.account_type': { value: 'single-account' },
              'aws.credentials.type': { value: 'cloud_connectors' },
            },
          },
        ],
      };

      renderComponent({
        newPolicy: mockPolicyWithoutSupport,
        input: inputWithCloudConnectors,
        updatePolicy: mockUpdatePolicyFn,
      });

      // Should not try to set to true - that's CloudConnectorSetup's job
      // The component should not call updatePolicy for this case
      const cloudConnectorCalls = mockUpdatePolicyFn.mock.calls.filter(
        (call) => call[0]?.updatedPolicy?.supports_cloud_connector === true
      );
      expect(cloudConnectorCalls).toHaveLength(0);
    });

    it('should not call updatePolicy when supports_cloud_connector is already false with non-cloud_connectors credential', () => {
      const mockUpdatePolicyFn = jest.fn();
      const mockPolicyWithoutSupport = {
        ...mockPackagePolicy,
        supports_cloud_connector: false, // Already correct
      };

      const inputWithDirectAccessKeys = {
        ...mockInput,
        streams: [
          {
            ...mockInput.streams[0],
            vars: {
              'aws.account_type': { value: 'single-account' },
              'aws.credentials.type': { value: 'direct_access_keys' },
            },
          },
        ],
      };

      renderComponent({
        newPolicy: mockPolicyWithoutSupport,
        input: inputWithDirectAccessKeys,
        updatePolicy: mockUpdatePolicyFn,
      });

      expect(mockUpdatePolicyFn).not.toHaveBeenCalled();
    });
  });
});
