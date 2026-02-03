/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import { LazyCloudConnectorSetup } from '@kbn/fleet-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  getTemplateUrlFromPackageInfo,
  updatePolicyWithInputs,
  gcpField,
  getGcpInputVarsFields,
  getCloudCredentialVarsConfig,
} from '../utils';
import {
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  GCP_CREDENTIALS_TYPE,
  GCP_PROVIDER,
} from '../constants';
import { GCPSetupInfoContent } from './gcp_setup_info';
import { GcpInputVarFields } from './gcp_input_var_fields';
import { ReadDocumentation } from '../common';
import { GoogleCloudShellCredentialsGuide } from './gcp_credentials_guide';
import type { UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';
import { GcpCredentialTypeSelector } from './gcp_credential_type_selector';

interface GcpFormAgentlessProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  disabled: boolean;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars: boolean;
  setupTechnology: SetupTechnology;
  cloud?: CloudSetup;
  isEditPage?: boolean;
}

const getAgentlessCredentialsType = (
  input: NewPackagePolicyInput,
  isGcpCloudConnectorEnabled: boolean
): string => {
  const credentialsType = input.streams?.[0]?.vars?.['gcp.credentials.type']?.value;

  if (!credentialsType && isGcpCloudConnectorEnabled) {
    return GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
  }

  if (!credentialsType) {
    return GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON;
  }

  return credentialsType;
};

const getGcpCredentialOptions = (
  isGcpCloudConnectorEnabled: boolean
): Array<{
  value: string;
  text: string;
}> => {
  const options = [
    {
      value: GCP_CREDENTIALS_TYPE.CREDENTIALS_JSON,
      text: 'Credentials JSON',
    },
  ];

  if (isGcpCloudConnectorEnabled) {
    options.unshift({
      value: GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
      text: 'Cloud Connectors',
    });
  }

  return options;
};

export const GcpCredentialsFormAgentless = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
  packageInfo,
  hasInvalidRequiredVars,
  setupTechnology,
  cloud,
  isEditPage = false,
}: GcpFormAgentlessProps) => {
  const {
    showCloudTemplates,
    templateName,
    gcpPolicyType,
    gcpOverviewPath,
    isGcpCloudConnectorEnabled,
  } = useCloudSetup();
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;
  const organizationFields = ['gcp.organization_id', 'gcp.credentials.json'];
  const singleAccountFields = ['gcp.project_id', 'gcp.credentials.json'];

  const gcpCredentialsType = getAgentlessCredentialsType(input, isGcpCloudConnectorEnabled);
  const credentialSelectionDisabled =
    isEditPage &&
    gcpCredentialsType === GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    isGcpCloudConnectorEnabled;

  // Ensures the cloud connector support is false if the credential type is not cloud_connectors
  React.useEffect(() => {
    if (
      gcpCredentialsType &&
      gcpCredentialsType !== GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
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
    gcpCredentialsType,
    newPolicy.supports_cloud_connector,
    newPolicy.cloud_connector_id,
    newPolicy,
    updatePolicy,
  ]);

  /*
    For Agentless only JSON credentials type is supported.
    Also in case of organisation setup, project_id is not required in contrast to Agent-based.
   */
  const fields = getGcpInputVarsFields(input, gcpField.fields).filter((field) => {
    if (isOrganization) {
      return organizationFields.includes(field.id);
    } else {
      return singleAccountFields.includes(field.id);
    }
  });

  const cloudShellUrl = getTemplateUrlFromPackageInfo(
    packageInfo,
    templateName,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_SHELL_URL
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  const commandText = `gcloud config set project <PROJECT_ID> && ${
    isOrganization ? `ORG_ID=<ORG_ID_VALUE> ` : ``
  }./deploy_service_account.sh`;

  return (
    <>
      <GCPSetupInfoContent isAgentless={true} />
      <EuiSpacer size="m" />
      {isGcpCloudConnectorEnabled && (
        <>
          <GcpCredentialTypeSelector
            options={getGcpCredentialOptions(isGcpCloudConnectorEnabled)}
            type={gcpCredentialsType}
            disabled={credentialSelectionDisabled}
            onChange={(optionId) => {
              updatePolicy({
                updatedPolicy: updatePolicyWithInputs(
                  {
                    ...newPolicy,
                    supports_cloud_connector: optionId === GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
                  },
                  gcpPolicyType,
                  getCloudCredentialVarsConfig({
                    setupTechnology,
                    optionId,
                    showCloudConnectors: isGcpCloudConnectorEnabled,
                    provider: GCP_PROVIDER,
                  })
                ),
              });
            }}
          />
          <EuiSpacer size="l" />
        </>
      )}
      {gcpCredentialsType === GCP_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
      isGcpCloudConnectorEnabled ? (
        <Suspense fallback={<EuiLoadingSpinner />}>
          <LazyCloudConnectorSetup
            input={input}
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            updatePolicy={updatePolicy}
            cloud={cloud}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            cloudProvider="gcp"
            templateName={templateName}
            isEditPage={isEditPage}
          />
        </Suspense>
      ) : (
        <>
          {!showCloudTemplates && (
            <>
              <EuiCallOut announceOnMount={false} color="warning">
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.cloudFormationSupportedMessage"
                  defaultMessage="Launch Cloud Shell for automated credentials not supported in current integration version. Please upgrade to the latest version to enable Launch Cloud Shell for automated credentials."
                />
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          )}
          {showCloudTemplates && (
            <>
              <EuiSpacer size="m" />
              <EuiAccordion
                id="cloudShellAccordianInstructions"
                data-test-subj="launchGoogleCloudShellAccordianInstructions"
                buttonContent={<EuiLink>{'Steps to Generate GCP Account Credentials'}</EuiLink>}
                paddingSize="l"
              >
                <GoogleCloudShellCredentialsGuide
                  isOrganization={isOrganization}
                  commandText={commandText}
                />
              </EuiAccordion>
              <EuiSpacer size="l" />
              <EuiButton
                data-test-subj="launchGoogleCloudShellAgentlessButton"
                target="_blank"
                iconSide="left"
                iconType="launch"
                href={cloudShellUrl}
              >
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.gcp.googleCloudShell.cloudCredentials.button"
                  defaultMessage="Launch Google Cloud Shell"
                />
              </EuiButton>
              <EuiSpacer size="l" />
            </>
          )}
          <GcpInputVarFields
            disabled={disabled}
            fields={fields}
            onChange={(key, value) =>
              updatePolicy({
                updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
                  [key]: { value },
                }),
              })
            }
            isOrganization={isOrganization}
            packageInfo={packageInfo}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
          <EuiSpacer size="s" />
          <ReadDocumentation url={gcpOverviewPath} />
          <EuiSpacer />
        </>
      )}
    </>
  );
};
