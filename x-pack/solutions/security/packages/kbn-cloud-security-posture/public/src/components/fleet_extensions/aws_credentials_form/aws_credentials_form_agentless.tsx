/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// x-pack/solutions/security/plugins/cloud_security_posture/public/components/fleet_extensions/aws_credentials_form/aws_credentials_form_agentless.tsx

import React from 'react';
import { EuiAccordion, EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import { i18n } from '@kbn/i18n';

import { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  CLOUD_CREDENTIALS_PACKAGE_VERSION,
  ORGANIZATION_ACCOUNT,
  SINGLE_ACCOUNT,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  cspIntegrationDocsNavigation,
  AWS_CREDENTIALS_TYPE,
} from '../constants';
import {
  getAgentlessCredentialsType,
  getAwsAgentlessFormOptions,
  getAwsCloudConnectorsCredentialsFormOptions,
  getAwsCloudConnectorsFormAgentlessOptions,
  getAwsCredentialsFormAgentlessOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import {
  getTemplateUrlFromPackageInfo,
  getCloudConnectorRemoteRoleTemplate,
  getCloudCredentialVarsConfig,
  getPosturePolicy,
} from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import { AWSSetupInfoContent } from './aws_setup_info';
import { AwsCredentialTypeSelector } from './aws_credential_type_selector';

import { AWS_CLOUD_FORMATION_ACCORDIAN_TEST_SUBJ } from './aws_test_subjects';
import { ReadDocumentation } from '../common';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_credential_guide';
import { getAwsCredentialsType } from './aws_utils';
import { NewPackagePolicyPostureInput, UpdatePolicy } from '../types';

interface AwsAgentlessFormProps {
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  setupTechnology: SetupTechnology;
  hasInvalidRequiredVars: boolean;
  showCloudConnectors: boolean;
  cloud?: CloudSetup;
}

// TODO: Extract cloud connector logic into separate component
export const AwsCredentialsFormAgentless = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage,
  setupTechnology,
  hasInvalidRequiredVars,
  showCloudConnectors,
  cloud,
}: AwsAgentlessFormProps) => {
  const accountType = input?.streams?.[0].vars?.['aws.account_type']?.value ?? SINGLE_ACCOUNT;

  const awsCredentialsType = getAgentlessCredentialsType(input, showCloudConnectors);

  const documentationLink = cspIntegrationDocsNavigation.cspm.awsGetStartedPath;
  // This should ony set the credentials after the initial render
  if (!getAwsCredentialsType(input)) {
    updatePolicy({
      updatedPolicy: {
        ...getPosturePolicy(newPolicy, input.type, {
          'aws.credentials.type': {
            value: awsCredentialsType,
            type: 'text',
          },
          'aws.supports_cloud_connectors': {
            value: awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
            type: 'bool',
          },
        }),
      },
    });
  }

  const isValidSemantic = semverValid(packageInfo.version);
  const showCloudCredentialsButton = isValidSemantic
    ? semverCompare(packageInfo.version, CLOUD_CREDENTIALS_PACKAGE_VERSION) >= 0
    : false;

  const automationCredentialTemplate = getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CREDENTIALS
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  const cloudConnectorRemoteRoleTemplate = cloud
    ? getCloudConnectorRemoteRoleTemplate({ input, cloud, packageInfo }) || undefined
    : undefined;

  const cloudFormationSettings: Record<
    string,
    { accordianTitleLink: React.ReactNode; templateUrl?: string }
  > = {
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      accordianTitleLink: <EuiLink>{'Steps to Generate AWS Account Credentials'}</EuiLink>,
      templateUrl: automationCredentialTemplate,
    },
    [AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
      accordianTitleLink: <EuiLink>{'Steps to Generate Cloud Connection'}</EuiLink>,
      templateUrl: cloudConnectorRemoteRoleTemplate,
    },
  };

  const isOrganization = accountType === ORGANIZATION_ACCOUNT;

  const isCloudFormationSupported =
    awsCredentialsType === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
    awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
  const agentlessOptions = showCloudConnectors
    ? getAwsCloudConnectorsCredentialsFormOptions()
    : getAwsAgentlessFormOptions();

  const group = agentlessOptions[awsCredentialsType as keyof typeof agentlessOptions];
  const fields = getInputVarsFields(input, group.fields);

  const selectorOptions = () => {
    if (isEditPage && AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS !== awsCredentialsType) {
      return getAwsCredentialsFormAgentlessOptions();
    }
    if (showCloudConnectors) {
      return getAwsCloudConnectorsFormAgentlessOptions();
    }

    return getAwsCredentialsFormAgentlessOptions();
  };

  const disabled =
    isEditPage &&
    awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    showCloudConnectors;

  const showCloudFormationAccordion = isCloudFormationSupported && showCloudCredentialsButton;

  const accordianTitleLink = showCloudFormationAccordion
    ? cloudFormationSettings[awsCredentialsType].accordianTitleLink
    : '';
  const templateUrl = showCloudFormationAccordion
    ? cloudFormationSettings[awsCredentialsType].templateUrl
    : '';

  return (
    <>
      <AWSSetupInfoContent
        info={
          showCloudConnectors ? (
            <FormattedMessage
              id="securitySolutionPackages.awsIntegration.gettingStarted.setupInfoContentAgentlessCloudConnector"
              defaultMessage="Utilize AWS Access Keys or Cloud Connector to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
              values={{
                gettingStartedLink: (
                  <EuiLink href={documentationLink} target="_blank">
                    <FormattedMessage
                      id="securitySolutionPackages.awsIntegration.gettingStarted.setupInfoContentLink"
                      defaultMessage="Getting Started"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="securitySolutionPackages.awsIntegration.gettingStarted.setupInfoContentAgentless"
              defaultMessage="Utilize AWS Access Keys to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
              values={{
                gettingStartedLink: (
                  <EuiLink href={documentationLink} target="_blank">
                    <FormattedMessage
                      id="securitySolutionPackages.awsIntegration.gettingStarted.setupInfoContentLink"
                      defaultMessage="Getting Started"
                    />
                  </EuiLink>
                ),
              }}
            />
          )
        }
      />
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        label={i18n.translate(
          'securitySolutionPackages.awsIntegration.awsCredentialTypeSelectorLabelAgentless',
          {
            defaultMessage: 'Preferred method',
          }
        )}
        type={awsCredentialsType}
        options={selectorOptions()}
        disabled={!!disabled}
        onChange={(optionId) => {
          updatePolicy({
            updatedPolicy: getPosturePolicy(
              newPolicy,
              input.type,
              getCloudCredentialVarsConfig({
                setupTechnology,
                optionId,
                showCloudConnectors,
                inputType: input.type,
              })
            ),
          });
        }}
      />
      <EuiSpacer size="m" />
      {!showCloudCredentialsButton && isCloudFormationSupported && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.awsCloudCredentials.cloudFormationSupportedMessage"
              defaultMessage="Launch Cloud Formation for Automated Credentials not supported in current integration version. Please upgrade to the latest version to enable Launch CloudFormation for automated credentials."
            />
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      )}
      {showCloudFormationAccordion && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="cloudFormationAccordianInstructions"
            data-test-subj={AWS_CLOUD_FORMATION_ACCORDIAN_TEST_SUBJ}
            buttonContent={accordianTitleLink}
            paddingSize="l"
          >
            <CloudFormationCloudCredentialsGuide
              isOrganization={isOrganization}
              credentialType={awsCredentialsType as 'cloud_connectors' | 'direct_access_keys'}
            />
          </EuiAccordion>
          <EuiSpacer size="l" />
          <EuiButton
            data-test-subj="launchCloudFormationAgentlessButton"
            target="_blank"
            iconSide="left"
            iconType="launch"
            href={templateUrl}
          >
            <FormattedMessage
              id="securitySolutionPackages.agentlessForms.agentlessAWSCredentialsForm.cloudFormation.launchButton"
              defaultMessage="Launch CloudFormation"
            />
          </EuiButton>
          <EuiSpacer size="m" />
        </>
      )}
      <AwsInputVarFields
        fields={fields}
        packageInfo={packageInfo}
        onChange={(key, value) => {
          updatePolicy({
            updatedPolicy: getPosturePolicy(newPolicy, input.type, { [key]: { value } }),
          });
        }}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <ReadDocumentation url={documentationLink} />
    </>
  );
};
