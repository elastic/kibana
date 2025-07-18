/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React from 'react';
import { EuiAccordion, EuiButton, EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';

import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/public';
import {
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
} from '../constants';
import {
  getAwsAgentlessFormOptions,
  getAwsCloudConnectorsCredentialsFormOptions,
  getAwsCloudConnectorsFormAgentlessOptions,
  getAwsCredentialsFormAgentlessOptions,
  getInputVarsFields,
} from './aws_credentials_form_options';
import {
  getAwsCredentialsType,
  getAssetPolicy,
  getTemplateUrlFromPackageInfo,
  getCloudCredentialVarsConfig,
  getCloudConnectorRemoteRoleTemplate,
} from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import {
  AWSSetupInfoContent,
  AwsCredentialTypeSelector,
  ReadDocumentation,
  getAgentlessCredentialsType,
} from './aws_credentials_form';
import {
  ASSET_INVENTORY_CLOUD_CREDENTIALS_PACKAGE_VERSION,
  TEST_SUBJ_AWS_CLOUD_FORMATION_ACCORDIAN,
  assetIntegrationDocsNavigation,
} from '../../../constants';
import { AWS_CREDENTIALS_TYPE, AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT } from './constants';
import { useKibana } from '../../../hooks/use_kibana';
import type { NewPackagePolicyAssetInput } from '../types';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export interface AwsAgentlessFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>;
  isEditPage?: boolean;
  setupTechnology?: SetupTechnology;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  hasInvalidRequiredVars: boolean;
  showCloudConnectors?: boolean;
}

export const CloudFormationCloudCredentialsGuide = ({
  isOrganization,
  credentialType,
}: {
  isOrganization?: boolean;
  credentialType: 'cloud_connectors' | 'direct_access_keys';
}) => {
  const credentialsTypeSteps: Record<
    string,
    { intro: React.JSX.Element; lastStep: React.JSX.Element }
  > = {
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      intro: (
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.description"
          defaultMessage="Access keys are long-term credentials for an IAM user or the AWS account root user.
Utilize AWS CloudFormation (a built-in AWS tool) or a series of manual steps to set up access. {learnMore}."
          values={{
            learnMore: (
              <EuiLink
                href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more about CloudFormation"
                />
              </EuiLink>
            ),
          }}
        />
      ),
      lastStep: (
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.credentials"
          defaultMessage="Copy {accessKeyId} and {secretAccessKey} then paste the credentials below"
          values={{
            accessKeyId: <strong>{'Access Key Id'}</strong>,
            secretAccessKey: <strong>{'Secret Access Key'}</strong>,
          }}
        />
      ),
    },
    [AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
      intro: (
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.description.cloudConnectors"
          defaultMessage="To enable Cloud Asset Discovery, you launch an AWS CloudFormation stack that automatically creates an IAM role in your account. This role includes the necessary permissions and embeds a unique External ID—generated during onboarding—into its trust policy. The resulting Role ARN and External ID are then used by Cloud Asset Discovery to securely assume the role and access your AWS resources. Roles do not have standard long-term credentials such as passwords or access keys. {learnMore}."
          values={{
            learnMore: (
              <EuiLink
                href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                <FormattedMessage
                  id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more about CloudFormation"
                />
              </EuiLink>
            ),
          }}
        />
      ),
      lastStep: (
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.credentials"
          defaultMessage="Copy {role} and {external_id} then paste the role credentials below"
          values={{
            role: <strong>{'Role ARN'}</strong>,
            external_id: <strong>{'External ID'}</strong>,
          }}
        />
      ),
    },
  };

  return (
    <EuiText size="s" color="subdued">
      {credentialsTypeSteps[credentialType]?.intro}
      <EuiSpacer size="l" />
      <EuiText size="s" color="subdued">
        <ol>
          {isOrganization ? (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.organizationLogin"
                defaultMessage="Log in as an {admin} in the management account of the AWS Organization you want to onboard"
                values={{
                  admin: <strong>{'admin'}</strong>,
                }}
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.singleLogin"
                defaultMessage="Log in as an {admin} in the AWS account you want to onboard"
                values={{
                  admin: <strong>{'admin'}</strong>,
                }}
              />
            </li>
          )}
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.launch"
              defaultMessage="Click the {launchCloudFormation} button below."
              values={{
                launchCloudFormation: <strong>{'Launch CloudFormation'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.region"
              defaultMessage="(Optional) Change the {amazonRegion} in the upper right corner to the region you want to deploy your stack to"
              values={{
                amazonRegion: <strong>{'AWS region'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.accept"
              defaultMessage="Tick the checkbox under {capabilities} in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
                capabilities: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.accept.capabilties"
                      defaultMessage="capabilities"
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.create"
              defaultMessage="Click {createStack}."
              values={{
                createStack: <strong>{'Create stack'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.stackStatus"
              defaultMessage="Once  stack status is {createComplete} then click the Outputs tab"
              values={{
                createComplete: <strong>{'CREATE_COMPLETE'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>{credentialsTypeSteps[credentialType]?.lastStep}</li>
        </ol>
      </EuiText>
    </EuiText>
  );
};

// TODO: Extract cloud connector logic into separate component
export const AwsCredentialsFormAgentless = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  hasInvalidRequiredVars,
  showCloudConnectors,
  setupTechnology,
  isEditPage,
}: AwsAgentlessFormProps) => {
  const { cloud } = useKibana().services;
  const accountType = input?.streams?.[0].vars?.['aws.account_type']?.value ?? AWS_SINGLE_ACCOUNT;

  const awsCredentialsType = getAgentlessCredentialsType(input, !!showCloudConnectors);
  const documentationLink = assetIntegrationDocsNavigation.awsGetStartedPath;

  // This should ony set the credentials after the initial render
  if (!getAwsCredentialsType(input)) {
    updatePolicy({
      ...getAssetPolicy(newPolicy, input.type, {
        'aws.credentials.type': {
          value: awsCredentialsType,
          type: 'text',
        },
        'aws.supports_cloud_connectors': {
          value: awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
          type: 'bool',
        },
      }),
    });
  }

  const automationCredentialTemplate = getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CREDENTIALS
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  const cloudConnectorRemoteRoleTemplate = getCloudConnectorRemoteRoleTemplate({
    input,
    cloud,
    packageInfo,
  });

  const cloudFormationSettings: Record<
    string,
    { accordianTitleLink: ReactElement; templateUrl?: string }
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
  const isCloudFormationSupported =
    awsCredentialsType === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
    awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;

  const agentlessOptions = showCloudConnectors
    ? getAwsCloudConnectorsCredentialsFormOptions()
    : getAwsAgentlessFormOptions();

  const group = agentlessOptions[awsCredentialsType as keyof typeof agentlessOptions];
  const fields = getInputVarsFields(input, group.fields);
  const isOrganization = accountType === AWS_ORGANIZATION_ACCOUNT;
  const isValidSemantic = semverValid(packageInfo.version);
  const showCloudCredentialsButton = isValidSemantic
    ? semverCompare(packageInfo.version, ASSET_INVENTORY_CLOUD_CREDENTIALS_PACKAGE_VERSION) >= 0
    : false;

  const disabled =
    !!isEditPage &&
    awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    showCloudConnectors;

  const showCloudFormationAccordion = isCloudFormationSupported && showCloudCredentialsButton;

  const selectorOptions = () => {
    if (isEditPage && AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS !== awsCredentialsType) {
      return getAwsCredentialsFormAgentlessOptions();
    }
    if (showCloudConnectors) {
      return getAwsCloudConnectorsFormAgentlessOptions();
    }

    return getAwsCredentialsFormAgentlessOptions();
  };

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
              id="xpack.securitySolution.assetInventory.awsIntegration.gettingStarted.setupInfoContentAgentlessCloudConnectors"
              defaultMessage="Utilize AWS Access Keys or Cloud Connectors to set up and deploy Asset Discovery for assessing your AWS environment's assets. Refer to our {gettingStartedLink} guide for details."
              values={{
                gettingStartedLink: (
                  <EuiLink href={documentationLink} target="_blank">
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.awsIntegration.gettingStarted.setupInfoContentLink"
                      defaultMessage="Getting Started"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.awsIntegration.gettingStarted.setupInfoContentAgentless"
              defaultMessage="Utilize AWS Access Keys to set up and deploy Asset Discovery for assessing your AWS environment's assets. Refer to our {gettingStartedLink} guide for details."
              values={{
                gettingStartedLink: (
                  <EuiLink href={documentationLink} target="_blank">
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.awsIntegration.gettingStarted.setupInfoContentLink"
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
          'xpack.securitySolution.assetInventory.awsIntegration.awsCredentialTypeSelectorLabelAgentless',
          {
            defaultMessage: 'Preferred method',
          }
        )}
        type={awsCredentialsType}
        options={selectorOptions()}
        disabled={disabled}
        onChange={(optionId) => {
          updatePolicy(
            getAssetPolicy(
              newPolicy,
              input.type,
              getCloudCredentialVarsConfig({
                setupTechnology,
                optionId,
                showCloudConnectors: !!showCloudConnectors,
                inputType: input.type,
              })
            )
          );
        }}
      />
      <EuiSpacer size="m" />
      {!showCloudCredentialsButton && isCloudFormationSupported && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.awsCloudCredentials.cloudFormationSupportedMessage"
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
            data-test-subj={TEST_SUBJ_AWS_CLOUD_FORMATION_ACCORDIAN}
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
              id="xpack.securitySolution.assetInventory.agentlessForm.agentlessAWSCredentialsForm.cloudFormation.launchButton"
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
          updatePolicy(getAssetPolicy(newPolicy, input.type, { [key]: { value } }));
        }}
        hasInvalidRequiredVars={hasInvalidRequiredVars}
      />
      <ReadDocumentation url={documentationLink} />
    </>
  );
};
