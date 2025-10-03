/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import { AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ } from '@kbn/cloud-security-posture-common';
import {
  ARM_TEMPLATE_EXTERNAL_DOC_URL,
  AZURE_CREDENTIALS_TYPE,
  AZURE_PROVIDER,
} from '../constants';
import { getCloudCredentialVarsConfig, updatePolicyWithInputs } from '../utils';
import type { AzureOptions } from './get_azure_credentials_form_options';
import {
  getAgentlessCredentialsType,
  getAzureAgentlessCredentialFormOptions,
  getAzureCloudConnectorsCredentialsFormOptions,
  getInputVarsFields,
} from './get_azure_credentials_form_options';
import type { UpdatePolicy } from '../types';
import { AzureInputVarFields } from './azure_input_var_fields';
import { AzureSetupInfoContent } from './azure_setup_info';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import { AzureCredentialTypeSelector } from './azure_credential_type_selector';
import { AzureSelectedCredentialsGuide } from './azure_credential_guides';

interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars: boolean;
  setupTechnology: SetupTechnology;
}

const getCloudConnectorCredentialOptions = (
  options: Partial<Pick<AzureOptions, 'cloud_connectors' | 'service_principal_with_client_secret'>>
): Array<{
  value: string;
  text: string;
}> => {
  return Object.entries(options).map(([key, value]) => ({
    value: key as keyof Pick<
      AzureOptions,
      'cloud_connectors' | 'service_principal_with_client_secret'
    >,
    text: value.label,
  }));
};

export const AzureCredentialsFormAgentless = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  hasInvalidRequiredVars,
  setupTechnology,
}: AzureCredentialsFormProps) => {
  const {
    azureOverviewPath,
    azurePolicyType,
    isAzureCloudConnectorEnabled,
    azureCloudConnectorRemoteRoleTemplate,
  } = useCloudSetup();

  const azureCredentialsType = getAgentlessCredentialsType(input, isAzureCloudConnectorEnabled);

  if (
    azureCredentialsType &&
    azureCredentialsType === 'cloud_connectors' &&
    !newPolicy.supports_cloud_connector
  ) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: true,
      },
    });
  }

  if (
    azureCredentialsType &&
    azureCredentialsType !== 'cloud_connectors' &&
    newPolicy.supports_cloud_connector
  ) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: false,
      },
    });
  }

  const agentlessOptions = isAzureCloudConnectorEnabled
    ? getAzureCloudConnectorsCredentialsFormOptions()
    : getAzureAgentlessCredentialFormOptions();

  const group = agentlessOptions[azureCredentialsType as keyof typeof agentlessOptions];
  const fields = getInputVarsFields(input, group.fields);

  return (
    <>
      <AzureSetupInfoContent documentationLink={azureOverviewPath} />
      <EuiSpacer size="l" />
      {isAzureCloudConnectorEnabled && (
        <>
          <AzureCredentialTypeSelector
            options={getCloudConnectorCredentialOptions(agentlessOptions)}
            type={azureCredentialsType}
            onChange={(optionId) => {
              updatePolicy({
                updatedPolicy: updatePolicyWithInputs(
                  {
                    ...newPolicy,
                    supports_cloud_connector: optionId === AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
                  },
                  azurePolicyType,
                  getCloudCredentialVarsConfig({
                    setupTechnology,
                    optionId,
                    showCloudConnectors: isAzureCloudConnectorEnabled,
                    provider: AZURE_PROVIDER,
                  })
                ),
              });
            }}
          />
          <EuiSpacer size="l" />
        </>
      )}
      <AzureSelectedCredentialsGuide azureCredentialType={azureCredentialsType} />
      {azureCredentialsType === 'cloud_connectors' && isAzureCloudConnectorEnabled && (
        <>
          <EuiButton
            data-test-subj={AZURE_LAUNCH_CLOUD_CONNECTOR_ARM_TEMPLATE_TEST_SUBJ}
            target="_blank"
            iconSide="left"
            iconType="launch"
            href={azureCloudConnectorRemoteRoleTemplate}
          >
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplate.launchCloudConnectorButton"
              defaultMessage="Deploy in Azure"
            />
          </EuiButton>
          <EuiSpacer size="m" />
        </>
      )}
      <AzureInputVarFields
        packageInfo={packageInfo}
        fields={fields}
        onChange={(key, value) => {
          updatePolicy({
            updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
              [key]: { value },
            }),
          });
        }}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <EuiSpacer size="m" />
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.armTemplateSetupNote"
          defaultMessage="Read the {documentation} for more details"
          values={{
            documentation: (
              <EuiLink
                href={ARM_TEMPLATE_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                {i18n.translate(
                  'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.documentationLinkText',
                  {
                    defaultMessage: 'documentation',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </>
  );
};
