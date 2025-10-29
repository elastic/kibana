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
        defaultMessage="Log in to the Azure console."
      />
    );
    const step2 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.2"
        defaultMessage="Return to Kibana. Click {deployButton}, below."
        values={{
          deployButton: <strong>{'Deploy in Azure'}</strong>,
        }}
      />
    );
    const step3 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.3"
        defaultMessage="(Optional) Set the {region} where you want to deploy your ARM template."
        values={{
          region: <strong>{'region'}</strong>,
        }}
      />
    );
    const step4 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.3"
        defaultMessage="Copy your {elasticStackId} into the ARM template. Do not change the value of the {issuer} field"
        values={{
          issuer: <strong>{'Elastic Cloud Issuer'}</strong>,
          elasticStackId: <strong>{'Elastic Stack ID'}</strong>,
        }}
      />
    );
    const step5 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.4"
        defaultMessage="Click {reviewButton}."
        values={{
          reviewButton: <strong>{'Review + Create'}</strong>,
        }}
      />
    );
    const step6 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.5"
        defaultMessage="Once the deployment is complete, go to the {outputs} tab and copy the {outputValues} fields and paste them into Kibana, below."
        values={{
          outputs: <strong>{'Outputs'}</strong>,
          outputValues: <strong>{'ClientID, TenantID, and Elastic Cloud Connector ID'}</strong>,
        }}
      />
    );
    const step7 = (
      <FormattedMessage
        id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.cloudconnectors.guide.steps.5a"
        defaultMessage="Click {saveContinue}"
        values={{ saveContinue: <strong>{'Save & Continue'}</strong> }}
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
          initialIsOpen={true}
        >
          <ol style={{ listStyleType: 'decimal', marginLeft: 24, lineHeight: '24px' }}>
            <li>{step1}</li>
            <li>{step2}</li>
            <li>{step3}</li>
            <li>
              {step4}
              <EuiSpacer size="m" />
              <EuiCodeBlock isCopyable fontSize="l">
                {elasticStackId}
              </EuiCodeBlock>
              <EuiSpacer size="m" />
            </li>
            <li>{step5}</li>
            <li>{step6}</li>
            <li>{step7}</li>
          </ol>
        </EuiAccordion>
        <EuiSpacer size="l" />
      </>
    );
  }

  return null;
};
