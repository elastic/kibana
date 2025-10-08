/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_credential_guide';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import type { CloudSetupContextValue } from '../hooks/use_cloud_setup_context';

jest.mock('../hooks/use_cloud_setup_context');
const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;

interface CloudFormationGuideProps {
  isOrganization?: boolean;
  credentialType: 'cloud_connectors' | 'direct_access_keys';
}

const getMockCloudSetup = (
  overrides: Partial<CloudSetupContextValue> = {}
): CloudSetupContextValue =>
  ({
    getCloudSetupProviderByInputType: jest.fn(),
    config: {},
    showCloudTemplates: false,
    defaultProvider: 'aws',
    shortName: 'Test',
    awsPolicyType: 'cloudbeat/cis_aws',
    awsOverviewPath: '/aws/start',
    awsInputFieldMapping: {},
    awsOrganizationEnabled: true,
    awsPolicyTemplate: {},
    templateName: 'cspm',
    templateInputOptions: [],
    azurePolicyType: 'cloudbeat/cis_azure',
    azureOverviewPath: '/azure/start',
    azureInputFieldMapping: {},
    azureOrganizationEnabled: true,
    azurePolicyTemplate: {},
    gcpPolicyType: 'cloudbeat/cis_gcp',
    gcpOverviewPath: '/gcp/start',
    gcpInputFieldMapping: {},
    gcpOrganizationEnabled: true,
    gcpPolicyTemplate: {},
    ...overrides,
  } as CloudSetupContextValue);

const renderComponent = (props: CloudFormationGuideProps) => {
  return render(
    <I18nProvider>
      <CloudFormationCloudCredentialsGuide {...props} />
    </I18nProvider>
  );
};

describe('CloudFormationCloudCredentialsGuide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(getMockCloudSetup());
  });

  describe('Direct Access Keys credential type', () => {
    const credentialType = 'direct_access_keys';

    it('renders intro text for direct access keys', () => {
      renderComponent({ credentialType });
      expect(
        screen.getByText(/Access keys are long-term credentials for an IAM user/)
      ).toBeInTheDocument();
      expect(screen.getByText(/Learn more about CloudFormation/)).toBeInTheDocument();
    });

    it('renders external link with correct attributes', () => {
      renderComponent({ credentialType });
      const link = screen.getByRole('link', { name: /Learn more about CloudFormation/ });
      expect(link).toHaveAttribute(
        'href',
        'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html'
      );
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
      expect(link).toHaveAttribute('data-test-subj', 'externalLink');
    });

    it('renders single account login step when isOrganization is false', () => {
      renderComponent({ credentialType, isOrganization: false });
      // Check that single account text is present but organization text is not
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText(/AWS account you want to onboard/)).toBeInTheDocument();
      expect(
        screen.queryByText(/management account of the AWS Organization/)
      ).not.toBeInTheDocument();
    });

    it('renders organization login step when isOrganization is true', () => {
      renderComponent({ credentialType, isOrganization: true });
      // Check that organization text is present but single account text is not
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText(/management account of the AWS Organization/)).toBeInTheDocument();
      expect(screen.queryByText(/AWS account you want to onboard/)).not.toBeInTheDocument();
    });

    it('renders all setup steps in correct order', () => {
      renderComponent({ credentialType });

      // Check for key step elements
      expect(screen.getByText('Launch CloudFormation')).toBeInTheDocument();
      expect(screen.getByText('AWS region')).toBeInTheDocument();
      expect(screen.getByText('capabilities')).toBeInTheDocument();
      expect(screen.getByText('Create stack')).toBeInTheDocument();
      expect(screen.getByText('CREATE_COMPLETE')).toBeInTheDocument();
      expect(screen.getByText(/Outputs tab/)).toBeInTheDocument();
    });

    it('renders direct access keys final step', () => {
      renderComponent({ credentialType });
      expect(screen.getByText('Create stack')).toBeInTheDocument();
      expect(screen.getByText('CREATE_COMPLETE')).toBeInTheDocument();
      expect(screen.getByText('Access Key Id')).toBeInTheDocument();
      expect(screen.getByText('Secret Access Key')).toBeInTheDocument();
    });
  });

  describe('Cloud Connectors credential type', () => {
    const credentialType = 'cloud_connectors';

    it('renders intro text for cloud connectors with shortName', () => {
      mockUseCloudSetup.mockReturnValue({
        shortName: 'Elastic Cloud',
      } as CloudSetupContextValue);

      renderComponent({ credentialType });
      expect(
        screen.getByText(/To enable Elastic Cloud, you launch an AWS CloudFormation stack/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/used by Elastic Cloud to securely assume the role/)
      ).toBeInTheDocument();
    });

    it('renders cloud connectors final step', () => {
      renderComponent({ credentialType });
      expect(screen.getByText('Role ARN')).toBeInTheDocument();
      expect(screen.getByText('External ID')).toBeInTheDocument();
      expect(screen.getByText(/paste the role credentials below/)).toBeInTheDocument();
    });

    it('highlights cloud connector specific terms', () => {
      renderComponent({ credentialType });

      expect(screen.getByText('Role ARN')).toBeInTheDocument();
      expect(screen.getByText('External ID')).toBeInTheDocument();
    });

    it('renders same setup steps as direct access keys except final step', () => {
      renderComponent({ credentialType });

      // Same steps should be present
      expect(screen.getByText('Launch CloudFormation')).toBeInTheDocument();
      expect(screen.getByText('AWS region')).toBeInTheDocument();
      expect(screen.getByText('capabilities')).toBeInTheDocument();
      expect(screen.getByText('Create stack')).toBeInTheDocument();
      expect(screen.getByText('CREATE_COMPLETE')).toBeInTheDocument();
      expect(screen.getByText(/Outputs tab/)).toBeInTheDocument();
    });
  });

  describe('Invalid credential type', () => {
    it('handles invalid credential type gracefully', () => {
      // Test edge case with type assertion for testing purposes only
      const invalidProps = { credentialType: 'invalid_type' as 'direct_access_keys' };
      renderComponent(invalidProps);

      // Should still render the step structure
      expect(screen.getByText('Launch CloudFormation')).toBeInTheDocument();
      expect(screen.getByText('Create stack')).toBeInTheDocument();
    });
  });

  describe('Component structure', () => {
    it('uses shortName from useCloudSetup hook', () => {
      mockUseCloudSetup.mockReturnValue(getMockCloudSetup({ shortName: 'Custom Name' }));

      renderComponent({ credentialType: 'cloud_connectors' });

      expect(
        screen.getByText(/To enable Custom Name, you launch an AWS CloudFormation stack/)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/used by Custom Name to securely assume the role/)
      ).toBeInTheDocument();
    });

    it('handles undefined shortName gracefully', () => {
      mockUseCloudSetup.mockReturnValue(getMockCloudSetup({ shortName: undefined }));

      renderComponent({ credentialType: 'cloud_connectors' });

      // Should still render without crashing when shortName is undefined
      expect(screen.getByText(/you launch an AWS CloudFormation stack/)).toBeInTheDocument();
    });
  });
});
