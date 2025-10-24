/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiAccordion, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';
import {
  AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ,
  AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import type { CloudConnectorFormProps, CloudSetupForCloudConnector } from '../types';
import { AzureArmTemplateGuide } from './azure_arm_template_guide';
import {
  type AzureCloudConnectorFieldNames,
  getCloudConnectorRemoteRoleTemplate,
  isAzureCredentials,
  updateInputVarsWithCredentials,
  updatePolicyWithAzureCloudConnectorCredentials,
  getDeploymentIdFromUrl,
  getKibanaComponentId,
} from '../utils';
import { AZURE_CLOUD_CONNECTOR_FIELD_NAMES, AZURE_PROVIDER } from '../constants';
import { getAzureCloudConnectorsCredentialsFormOptions } from './azure_cloud_connector_options';
import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';

const getElasticStackId = (cloud?: CloudSetupForCloudConnector): string | undefined => {
  if (!cloud) return undefined;

  if (cloud?.isServerlessEnabled && cloud?.serverless?.projectId) {
    return cloud.serverless.projectId;
  }

  const deploymentId = getDeploymentIdFromUrl(cloud?.deploymentUrl);
  const kibanaComponentId = getKibanaComponentId(cloud?.cloudId);

  if (cloud?.isCloudEnabled && deploymentId && kibanaComponentId) {
    return kibanaComponentId;
  }

  return undefined;
};

export const AzureCloudConnectorForm: React.FC<CloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  cloud,
  hasInvalidRequiredVars = false,
  templateName = 'azure-cloud-connector-template',
  credentials,
  setCredentials,
}) => {
  const armTemplateUrl =
    cloud && templateName
      ? getCloudConnectorRemoteRoleTemplate({
          input,
          cloud,
          packageInfo,
          templateName,
          provider: AZURE_PROVIDER,
        })
      : undefined;

  const elasticStackId = getElasticStackId(cloud);

  const inputVars = input.streams.find((i) => i.enabled)?.vars;

  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const azureFormConfig = getAzureCloudConnectorsCredentialsFormOptions(updatedInputVars);
  const fields = azureFormConfig?.fields;

  return (
    <>
      <EuiAccordion
        id="armTemplateAccordianInstructions"
        data-test-subj={AZURE_CLOUD_CONNECTOR_SETUP_INSTRUCTIONS_TEST_SUBJ}
        buttonContent={<EuiLink>{'Steps to create Managed User Identity in Azure'}</EuiLink>}
        paddingSize="l"
        initialIsOpen={true}
      >
        <AzureArmTemplateGuide elasticStackId={elasticStackId} />
      </EuiAccordion>
      <EuiSpacer size="l" />
      {armTemplateUrl && (
        <>
          <EuiButton
            data-test-subj={AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ}
            target="_blank"
            iconSide="left"
            iconType="launch"
            href={armTemplateUrl}
          >
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.azureCloudConnector.launchButton"
              defaultMessage="Deploy to Azure"
            />
          </EuiButton>
          <EuiSpacer size="m" />
        </>
      )}

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            // Update local credentials state if available
            if (credentials && isAzureCredentials(credentials) && setCredentials) {
              const updatedCredentials = { ...credentials };
              if (
                key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID ||
                key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_TENANT_ID
              ) {
                updatedCredentials.tenantId = value;
              } else if (
                key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID ||
                key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CLIENT_ID
              ) {
                updatedCredentials.clientId = value;
              } else if (
                key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
              ) {
                updatedCredentials.azure_credentials_cloud_connector_id = value;
              }
              setCredentials(updatedCredentials);
            } else {
              // Fallback to old method
              const updatedPolicyWithCredentials = updatePolicyWithAzureCloudConnectorCredentials(
                newPolicy,
                input,
                {
                  [key]: value,
                } as Record<AzureCloudConnectorFieldNames, string | undefined>
              );

              updatePolicy({
                updatedPolicy: updatedPolicyWithCredentials,
              });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
