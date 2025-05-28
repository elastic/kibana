/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiButton, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import {
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
} from '../constants';
import {
  DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE,
  getAwsCredentialsFormAgentlessOptions,
  getAwsCredentialsFormOptions,
  getInputVarsFields,
} from './aws_credentials_form_options';
import { getAwsCredentialsType, getAssetPolicy, getTemplateUrlFromPackageInfo } from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import {
  type AwsFormProps,
  AWSSetupInfoContent,
  AwsCredentialTypeSelector,
  ReadDocumentation,
} from './aws_credentials_form';
import { assetIntegrationDocsNavigation } from '../../../constants';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT } from './constants';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export const CloudFormationCloudCredentialsGuide = ({
  isOrganization,
}: {
  isOrganization?: boolean;
}) => {
  return (
    <EuiText size="s" color="subdued">
      <FormattedMessage
        id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.guide.description"
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
                id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.guide.learnMoreLinkText"
                defaultMessage="Learn more about CloudFormation"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="l" />
      <EuiText size="s" color="subdued">
        <ol>
          {isOrganization ? (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.guide.steps.organizationLogin"
                defaultMessage="Log in as an {admin} in the management account of the AWS Organization you want to onboard"
                values={{
                  admin: <strong>{'admin'}</strong>,
                }}
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.guide.steps.singleLogin"
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
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.guide.steps.launch"
              defaultMessage="Click the {launchCloudFormation} button below."
              values={{
                launchCloudFormation: <strong>{'Launch CloudFormation'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.region"
              defaultMessage="(Optional) Change the {amazonRegion} in the upper right corner to the region you want to deploy your stack to"
              values={{
                amazonRegion: <strong>{'AWS region'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.accept"
              defaultMessage="Tick the checkbox under {capabilities} in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
                capabilities: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.accept.capabilties"
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
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.create"
              defaultMessage="Click {createStack}."
              values={{
                createStack: <strong>{'Create stack'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.stackStatus"
              defaultMessage="Once  stack status is {createComplete} then click the Outputs tab"
              values={{
                createComplete: <strong>{'CREATE_COMPLETE'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.cloudFormation.steps.credentials"
              defaultMessage="Copy {accessKeyId} and {secretAccessKey} then paste the credentials below"
              values={{
                accessKeyId: <strong>{'Access Key Id'}</strong>,
                secretAccessKey: <strong>{'Secret Access Key'}</strong>,
              }}
            />
          </li>
        </ol>
      </EuiText>
    </EuiText>
  );
};

export const AwsCredentialsFormAgentless = ({
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  hasInvalidRequiredVars,
}: AwsFormProps) => {
  const awsCredentialsType = getAwsCredentialsType(input) || DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE;
  const options = getAwsCredentialsFormOptions();
  const group = options[awsCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const documentationLink = assetIntegrationDocsNavigation.awsGetStartedPath;
  const accountType = input?.streams?.[0].vars?.['aws.account_type']?.value ?? AWS_SINGLE_ACCOUNT;

  // This should ony set the credentials after the initial render
  if (!getAwsCredentialsType(input)) {
    updatePolicy({
      ...getAssetPolicy(newPolicy, input.type, {
        'aws.credentials.type': {
          value: awsCredentialsType,
          type: 'text',
        },
      }),
    });
  }

  const automationCredentialTemplate = getTemplateUrlFromPackageInfo(
    packageInfo,
    input.policy_template,
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CREDENTIALS
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  const isOrganization = accountType === AWS_ORGANIZATION_ACCOUNT;

  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.fleetIntegration.gettingStarted.setupInfoContentAgentless"
            defaultMessage="Utilize AWS Access Keys to set up and deploy Cloud Asset Discovery for assessing your AWS environment's assets. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={documentationLink} target="_blank">
                  <FormattedMessage
                    id="xpack.securitySolution.assetInventory.fleetIntegration.gettingStarted.setupInfoContentLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer size="l" />
      <AwsCredentialTypeSelector
        label={i18n.translate(
          'xpack.securitySolution.assetInventory.fleetIntegration.awsCredentialTypeSelectorLabelAgentless',
          {
            defaultMessage: 'Preferred method',
          }
        )}
        type={awsCredentialsType}
        options={getAwsCredentialsFormAgentlessOptions()}
        onChange={(optionId) => {
          updatePolicy(
            getAssetPolicy(newPolicy, input.type, {
              'aws.credentials.type': { value: optionId },
            })
          );
        }}
      />
      <EuiSpacer size="m" />
      {awsCredentialsType === DEFAULT_AGENTLESS_AWS_CREDENTIALS_TYPE && (
        <>
          <EuiSpacer size="m" />
          <EuiAccordion
            id="cloudFormationAccordianInstructions"
            data-test-subj="launchGoogleCloudFormationAccordianInstructions"
            buttonContent={<EuiLink>{'Steps to Generate AWS Account Credentials'}</EuiLink>}
            paddingSize="l"
          >
            <CloudFormationCloudCredentialsGuide isOrganization={isOrganization} />
          </EuiAccordion>
          <EuiSpacer size="l" />
          <EuiButton
            data-test-subj="launchCloudFormationAgentlessButton"
            target="_blank"
            iconSide="left"
            iconType="launch"
            href={automationCredentialTemplate}
          >
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.agentlessForm.agentlessAWSCredentialsForm.cloudFormation.launchButton"
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
