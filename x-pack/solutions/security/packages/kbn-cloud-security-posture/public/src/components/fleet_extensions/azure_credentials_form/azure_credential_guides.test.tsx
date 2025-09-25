/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AzureSelectedCredentialsGuide } from './azure_credential_guides';
import type { AzureCredentialsType } from '../types';
import * as cloudSetupContext from '../hooks/use_cloud_setup_context';
import { AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ } from '@kbn/cloud-security-posture-common';

// Mock the cloud setup context
const mockUseCloudSetup = jest.fn();
jest.spyOn(cloudSetupContext, 'useCloudSetup').mockImplementation(mockUseCloudSetup);

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
  elasticStackId: 'test-elastic-stack-id-12345',
};

const renderWithIntl = (component: React.ReactElement) =>
  render(<I18nProvider>{component}</I18nProvider>);

describe('AzureSelectedCredentialsGuide', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCloudSetup.mockReturnValue(defaultMockCloudSetup);
  });

  describe('cloud_connectors credential type', () => {
    const credentialType: AzureCredentialsType = 'cloud_connectors';

    it('renders description and accordion with all setup steps', () => {
      renderWithIntl(<AzureSelectedCredentialsGuide azureCredentialType={credentialType} />);

      // Description
      expect(
        screen.getByText(/Cloud Connector uses Azure Managed Identity to set up access/i)
      ).toBeInTheDocument();

      // Accordion
      const accordion = screen.getByTestId(AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ);
      expect(accordion).toBeInTheDocument();
      expect(
        screen.getByText('Steps to create Managed User Identity in Azure')
      ).toBeInTheDocument();

      // Check for key text content
      expect(screen.getByText(/Log in to/)).toBeInTheDocument();
      expect(screen.getByText('Deploy in Azure')).toBeInTheDocument();
      expect(screen.getByText(/Change the.*region/)).toBeInTheDocument();
      expect(screen.getByText('Review + Create')).toBeInTheDocument();
      expect(screen.getByText(/Once the deployment is complete/)).toBeInTheDocument();

      // Sub-steps and emphasized text
      expect(screen.getByText('ClientID')).toBeInTheDocument();
      expect(screen.getByText('TenantID')).toBeInTheDocument();
      expect(screen.getByText('Elastic Cloud Connector Id')).toBeInTheDocument();

      const codeBlock = screen.getByText('test-elastic-stack-id-12345');
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock.closest('code')).toBeTruthy();
    });

    describe('non-cloud_connectors credential types', () => {
      const nonCloudConnectorTypes: AzureCredentialsType[] = [
        'arm_template',
        'manual',
        'service_principal_with_client_secret',
        'service_principal_with_client_certificate',
        'service_principal_with_client_username_and_password',
      ];

      it('returns null for all non-cloud_connectors credential types', () => {
        nonCloudConnectorTypes.forEach((credential) => {
          const { container } = renderWithIntl(
            <AzureSelectedCredentialsGuide azureCredentialType={credential} />
          );
          expect(container.firstChild).toBeNull();

          // Ensure no content is rendered
          const { container: container2 } = renderWithIntl(
            <AzureSelectedCredentialsGuide azureCredentialType={credential} />
          );
          expect(
            container2.querySelector(
              `[data-test-subj="${AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}"]`
            )
          ).toBeNull();
        });
      });
    });
  });
});
