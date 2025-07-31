/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import { FormattedMessage } from '@kbn/i18n-react';
import { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { getTemplateUrlFromPackageInfo, getPosturePolicy } from '../utils';
import {
  CLOUD_CREDENTIALS_PACKAGE_VERSION,
  ORGANIZATION_ACCOUNT,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  cspIntegrationDocsNavigation,
} from '../constants';
import { GCPSetupInfoContent } from './gcp_setup_info';
import { GcpInputVarFields } from './gcp_input_var_fields';
import { ReadDocumentation } from '../common';
import { GoogleCloudShellCredentialsGuide } from './gcp_credentials_guide';
import { getInputVarsFields, gcpField } from './gcp_utils';
import { NewPackagePolicyPostureInput, UpdatePolicy } from '../types';

interface GcpFormAgentlessProps {
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_gcp' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  disabled: boolean;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars: boolean;
}

export const GcpCredentialsFormAgentless = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
  packageInfo,
  hasInvalidRequiredVars,
}: GcpFormAgentlessProps) => {
  const accountType = input.streams?.[0]?.vars?.['gcp.account_type']?.value;
  const isOrganization = accountType === ORGANIZATION_ACCOUNT;
  const organizationFields = ['gcp.organization_id', 'gcp.credentials.json'];
  const singleAccountFields = ['gcp.project_id', 'gcp.credentials.json'];

  const isValidSemantic = semverValid(packageInfo.version);
  const showCloudCredentialsButton = isValidSemantic
    ? semverCompare(packageInfo.version, CLOUD_CREDENTIALS_PACKAGE_VERSION) >= 0
    : false;

  /*
    For Agentless only JSON credentials type is supported.
    Also in case of organisation setup, project_id is not required in contrast to Agent-based.
   */
  const fields = getInputVarsFields(input, gcpField.fields).filter((field) => {
    if (isOrganization) {
      return organizationFields.includes(field.id);
    } else {
      return singleAccountFields.includes(field.id);
    }
  });

  const cloudShellUrl = getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_SHELL_URL
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  const commandText = `gcloud config set project ${
    isOrganization ? `<PROJECT_ID> && ORG_ID=<ORG_ID_VALUE>` : `<PROJECT_ID>`
  } ./deploy_service_account.sh`;

  return (
    <>
      <GCPSetupInfoContent isAgentless={true} />
      <EuiSpacer size="m" />
      {!showCloudCredentialsButton && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="securitySolutionPackages.cspIntegration.gcpCloudCredentials.cloudFormationSupportedMessage"
              defaultMessage="Launch Cloud Shell for automated credentials not supported in current integration version. Please upgrade to the latest version to enable Launch Cloud Shell for automated credentials."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {showCloudCredentialsButton && (
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
              id="securitySolutionPackages.agentlessForms.googleCloudShell.cloudCredentials.button"
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
            updatedPolicy: getPosturePolicy(newPolicy, input.type, { [key]: { value } }),
          })
        }
        isOrganization={isOrganization}
        packageInfo={packageInfo}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <EuiSpacer size="s" />
      <ReadDocumentation url={cspIntegrationDocsNavigation.cspm.gcpGetStartedPath} />
      <EuiSpacer />
    </>
  );
};
