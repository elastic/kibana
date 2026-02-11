/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';

import { EuiLink, EuiSpacer, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import { LazyCloudConnectorSetup } from '@kbn/fleet-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
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

interface AzureCredentialsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars: boolean;
  setupTechnology: SetupTechnology;
  cloud?: CloudSetup;
  isEditPage?: boolean;
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
  cloud,
  isEditPage = false,
}: AzureCredentialsFormProps) => {
  const { azureOverviewPath, azurePolicyType, isAzureCloudConnectorEnabled, templateName } =
    useCloudSetup();

  const azureCredentialsType = getAgentlessCredentialsType(input, isAzureCloudConnectorEnabled);
  const credentialSelectionDisabled =
    isEditPage &&
    azureCredentialsType === AZURE_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    isAzureCloudConnectorEnabled;

  // Ensures the  cloud connector support is false if the credential if azureCredentialsType is not cloud_connectors
  React.useEffect(() => {
    if (
      azureCredentialsType &&
      azureCredentialsType !== 'cloud_connectors' &&
      (newPolicy.supports_cloud_connector || newPolicy.cloud_connector_id)
    ) {
      updatePolicy({
        updatedPolicy: {
          ...newPolicy,
          supports_cloud_connector: false,
          cloud_connector_id: undefined,
        },
      });
    }
  }, [
    azureCredentialsType,
    newPolicy.supports_cloud_connector,
    newPolicy.cloud_connector_id,
    newPolicy,
    updatePolicy,
  ]);

  // Get agentless options based on whether cloud connector is enabled
  const agentlessOptions = isAzureCloudConnectorEnabled
    ? getAzureCloudConnectorsCredentialsFormOptions()
    : getAzureAgentlessCredentialFormOptions();

  const group = agentlessOptions[azureCredentialsType as keyof typeof agentlessOptions];
  const fields = getInputVarsFields(input, group?.fields || []);

  return (
    <>
      <AzureSetupInfoContent documentationLink={azureOverviewPath} />
      <EuiSpacer size="l" />
      {isAzureCloudConnectorEnabled && (
        <>
          <AzureCredentialTypeSelector
            options={getCloudConnectorCredentialOptions(agentlessOptions)}
            type={azureCredentialsType}
            disabled={credentialSelectionDisabled}
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
      {azureCredentialsType === 'cloud_connectors' && isAzureCloudConnectorEnabled ? (
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazyCloudConnectorSetup
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            cloud={cloud}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            cloudProvider="azure"
            templateName={templateName}
            isEditPage={isEditPage}
          />
        </Suspense>
      ) : (
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
      )}
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
