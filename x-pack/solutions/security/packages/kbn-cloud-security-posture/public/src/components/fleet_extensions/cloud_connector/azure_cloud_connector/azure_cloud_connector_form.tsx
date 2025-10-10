/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiAccordion, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';
import type { NewPackagePolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type { CloudConnectorFormProps } from '../types';
import { AzureArmTemplateGuide } from './azure_arm_template_guide';
import {
  getCloudConnectorRemoteRoleTemplate,
  getElasticStackId,
  isAzureCredentials,
  updateInputVarsWithCredentials,
} from '../utils';
import { AZURE_CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';
import { getAzureCloudConnectorsCredentialsFormOptions } from './azure_cloud_connector_options';
import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';

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
  // For now, we'll use a placeholder ARM template URL
  // In a real implementation, this would be generated similarly to AWS CloudFormation
  const armTemplateUrl =
    cloud && templateName
      ? getCloudConnectorRemoteRoleTemplate({
          input,
          cloud,
          packageInfo,
          templateName,
          provider: 'azure',
        })
      : undefined;

  const elasticStackId = getElasticStackId(cloud);

  const inputVars = input.streams.find((i) => i.enabled)?.vars;

  // Update inputVars with current credentials using utility function or inputVars if no credentials are provided
  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const azureFormConfig = getAzureCloudConnectorsCredentialsFormOptions(updatedInputVars);
  const fields = azureFormConfig?.fields;

  // Helper function to update Azure policy with credentials
  const updatePolicyWithAzureCredentials = (
    policy: NewPackagePolicy,
    inputData: NewPackagePolicyInput,
    credentialUpdate: Record<string, string>
  ) => {
    const updatedPolicy = { ...policy };

    // Find the input to update
    const updatedInputs = updatedPolicy.inputs?.map((policyInput: NewPackagePolicyInput) => {
      if (
        policyInput.policy_template === inputData.policy_template &&
        policyInput.type === inputData.type
      ) {
        const updatedStreams = policyInput.streams?.map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (stream: any) => {
            if (stream.data_stream.dataset === inputData.streams[0].data_stream.dataset) {
              return {
                ...stream,
                vars: {
                  ...stream.vars,
                  ...Object.entries(credentialUpdate).reduce((acc, [key, value]) => {
                    acc[key] = { value };
                    return acc;
                  }, {} as Record<string, { value: string }>),
                },
              };
            }
            return stream;
          }
        );
        return {
          ...policyInput,
          streams: updatedStreams,
        };
      }
      return policyInput;
    });

    return {
      ...updatedPolicy,
      inputs: updatedInputs,
    };
  };

  return (
    <>
      <EuiAccordion
        id="armTemplateAccordianInstructions"
        data-test-subj={''}
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
            data-test-subj="launchArmTemplateAgentlessButton"
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
              if (key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.TENANT_ID) {
                updatedCredentials.tenantId = value;
              } else if (key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.CLIENT_ID) {
                updatedCredentials.clientId = value;
              } else if (
                key === AZURE_CLOUD_CONNECTOR_FIELD_NAMES.AZURE_CREDENTIALS_CLOUD_CONNECTOR_ID
              ) {
                updatedCredentials.azure_credentials_cloud_connector_id = value;
              }
              setCredentials(updatedCredentials);
            } else {
              // Fallback to old method
              updatePolicy({
                updatedPolicy: updatePolicyWithAzureCredentials(newPolicy, input, {
                  [key]: value,
                }),
              });
            }
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
