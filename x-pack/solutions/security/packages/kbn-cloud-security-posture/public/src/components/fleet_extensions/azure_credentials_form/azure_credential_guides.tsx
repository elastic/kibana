/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiAccordion, EuiLink, EuiCodeBlock } from '@elastic/eui';
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
    const step1 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.1"
        defaultMessage="Log in to {azure} console"
        values={{
          azure: <strong>{'Azure'}</strong>,
        }}
      />
    );
    const step2 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.2"
        defaultMessage="Click {deployButton} button"
        values={{
          deployButton: <strong>{'Deploy in Azure'}</strong>,
        }}
      />
    );
    const step3 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.3"
        defaultMessage="(Optional) Change the {region} to the region you want to deploy your ARM template to. The ARM template automatically comes with {issuer} field(please do not change this value). The ARM template expects {elasticStackId}, copy it below:"
        values={{
          region: <strong>{'region'}</strong>,
          issuer: <strong>{'Elastic Cloud Issuer'}</strong>,
          elasticStackId: <strong>{'Elastic Stack ID'}</strong>,
        }}
      />
    );
    const step4 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.4"
        defaultMessage="Click {reviewButton} button"
        values={{
          reviewButton: <strong>{'Review + Create'}</strong>,
        }}
      />
    );
    const step5 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.5"
        defaultMessage="Once the deployment is complete then click the {outputs} tab and copy the following 3 fields and paste below:"
        values={{
          outputs: <strong>{'Outputs'}</strong>,
        }}
      />
    );
    const step5a = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.5a"
        defaultMessage="{clientId} - a secret that represents the created federated identity"
        values={{ clientId: <strong>{'ClientID'}</strong> }}
      />
    );
    const step5b = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.5b"
        defaultMessage="{tenantId} - the tenant of the client in azure"
        values={{ tenantId: <strong>{'TenantID'}</strong> }}
      />
    );
    const step5c = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.5c"
        defaultMessage="{connectorId} - unique ID to identify the Azure cloud connection (This ID is also used in the managed identity name on your Azure subscription)"
        values={{ connectorId: <strong>{'Elastic Cloud Connector Id'}</strong> }}
      />
    );
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
          <ol style={{ listStyleType: 'decimal', marginLeft: 24, lineHeight: '24px' }}>
            <li>{step1}</li>
            <li>{step2}</li>
            <li>
              {step3}
              <EuiSpacer size="m" />
              <EuiCodeBlock isCopyable fontSize="l">
                {elasticStackId}
              </EuiCodeBlock>
              <EuiSpacer size="m" />
            </li>
            <li>{step4}</li>
            <li>{step5}</li>
            <ol type="a" style={{ listStyleType: 'lower-alpha', marginLeft: 24 }}>
              <li>{step5a}</li>
              <li>{step5b}</li>
              <li>{step5c}</li>
            </ol>
          </ol>
        </EuiAccordion>
        <EuiSpacer size="l" />
      </>
    );
  }

  return null;
};
