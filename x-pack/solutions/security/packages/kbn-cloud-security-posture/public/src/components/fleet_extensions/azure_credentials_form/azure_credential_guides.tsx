/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiAccordion, EuiLink } from '@elastic/eui';
import { AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ } from '@kbn/cloud-security-posture-common';
import type { AzureCredentialsType } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

export const AzureSelectedCredentialsGuide = ({
  azureCredentialType,
}: {
  azureCredentialType: AzureCredentialsType;
}) => {
  const { elasticStackId } = useCloudSetup();

  if (azureCredentialType === 'cloud_connectors') {
    return (
      <>
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplate.cloudConnectorDescription"
          defaultMessage="Cloud Connector uses Azure Managed Identity to set up access. An Azure Managed Identity is a Microsoft Entra ID (Azure AD)–backed service principal that Azure creates and manages for you. You assign its permissions through Azure role-based access control (RBAC), and Azure automatically handles credential issuance and rotation - no passwords, secrets, or keys to store. To create or assign a managed identity for a new cloud connector, the person running the setup must have Owner or User Access Administrator rights (or equivalent) on the target subscription"
        />
        <EuiSpacer size="m" />
        <EuiAccordion
          id="cloudConnectorAccordianInstructions"
          data-test-subj={AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}
          buttonContent={<EuiLink>{'Steps to create Managed User Identity in Azure'}</EuiLink>}
          paddingSize="l"
        >
          <ul>
            <li>{'Blah blah blah'}</li>
            <li>
              {'Elastic Stack Id:'} {elasticStackId}
            </li>
          </ul>
        </EuiAccordion>
        <EuiSpacer size="l" />
      </>
    );
  }

  return null;
};
