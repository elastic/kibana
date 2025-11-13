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
import { createAwsCloudSetupMock } from '../test/cloud_setup_mocks';

jest.mock('../hooks/use_cloud_setup_context');
const mockUseCloudSetup = useCloudSetup as jest.MockedFunction<typeof useCloudSetup>;

interface CloudFormationGuideProps {
  isOrganization?: boolean;
  credentialType: 'cloud_connectors' | 'direct_access_keys';
}

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
    mockUseCloudSetup.mockReturnValue(createAwsCloudSetupMock({ shortName: 'Test' }));
  });

  describe('Direct Access Keys credential type', () => {
    it('renders setup guide for single account', () => {
      renderComponent({ credentialType: 'direct_access_keys', isOrganization: false });
      expect(screen.getByText(/AWS account you want to onboard/)).toBeInTheDocument();
      expect(
        screen.queryByText(/management account of the AWS Organization/)
      ).not.toBeInTheDocument();
    });

    it('renders setup guide for organization account', () => {
      renderComponent({ credentialType: 'direct_access_keys', isOrganization: true });
      expect(screen.getByText(/management account of the AWS Organization/)).toBeInTheDocument();
      expect(screen.queryByText(/AWS account you want to onboard/)).not.toBeInTheDocument();
    });

    it('displays complete CloudFormation setup steps and links', () => {
      renderComponent({ credentialType: 'direct_access_keys' });

      // Verify CloudFormation setup steps
      expect(screen.getByText('Launch CloudFormation')).toBeInTheDocument();
      expect(screen.getByText('AWS region')).toBeInTheDocument();
      expect(screen.getByText('capabilities')).toBeInTheDocument();
      expect(screen.getByText('Create stack')).toBeInTheDocument();
      expect(screen.getByText('CREATE_COMPLETE')).toBeInTheDocument();
      expect(screen.getByText(/Outputs tab/)).toBeInTheDocument();

      // Verify external link attributes
      const link = screen.getByRole('link', { name: /Learn more about CloudFormation/ });
      expect(link).toHaveAttribute('target', '_blank');

      // Verify credential-specific content
      expect(
        screen.getByText(/Access keys are long-term credentials for an IAM user/)
      ).toBeInTheDocument();
    });
  });

  describe('Cloud Connectors credential type', () => {
    it('renders cloud connector specific content and setup steps', () => {
      renderComponent({ credentialType: 'cloud_connectors' });

      // Cloud connector specific elements
      expect(screen.getByText('Role ARN')).toBeInTheDocument();
      expect(screen.getByText('External ID')).toBeInTheDocument();

      // Same CloudFormation setup steps
      expect(screen.getByText('Launch CloudFormation')).toBeInTheDocument();
      expect(screen.getByText('Create stack')).toBeInTheDocument();
    });
  });

  describe('Component behavior with different contexts', () => {
    it('uses shortName from cloud setup context', () => {
      mockUseCloudSetup.mockReturnValue(createAwsCloudSetupMock({ shortName: 'Custom Name' }));

      renderComponent({ credentialType: 'cloud_connectors' });

      expect(
        screen.getByText(/To enable Custom Name, you launch an AWS CloudFormation stack/)
      ).toBeInTheDocument();
    });

    it('handles edge cases gracefully', () => {
      // Test with invalid credential type (edge case)
      const invalidProps = { credentialType: 'invalid_type' as 'direct_access_keys' };
      renderComponent(invalidProps);

      // Should still render core CloudFormation structure
      expect(screen.getByText('Launch CloudFormation')).toBeInTheDocument();
    });
  });
});
