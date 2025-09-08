/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { AWS_CREDENTIALS_TYPE } from '../constants';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export const CloudFormationCloudCredentialsGuide = ({
  isOrganization,
  credentialType,
}: {
  isOrganization?: boolean;
  credentialType: 'cloud_connectors' | 'direct_access_keys';
}) => {
  const { shortName } = useCloudSetup();
  const credentialsTypeSteps: Record<
    string,
    { intro: React.JSX.Element; lastStep: React.JSX.Element }
  > = {
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      intro: (
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.description"
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
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more about CloudFormation"
                />
              </EuiLink>
            ),
          }}
        />
      ),
      lastStep: (
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.credentials"
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
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.description.cloudConnectors"
          defaultMessage="To enable {shortName}, you launch an AWS CloudFormation stack that automatically creates an IAM role in your account. This role includes the necessary permissions and embeds a unique External ID—generated during onboarding—into its trust policy. The resulting Role ARN and External ID are then used by {shortName} to securely assume the role and access your AWS resources. Roles do not have standard long-term credentials such as passwords or access keys. {learnMore}."
          values={{
            shortName,
            learnMore: (
              <EuiLink
                href={CLOUD_FORMATION_EXTERNAL_DOC_URL}
                target="_blank"
                rel="noopener nofollow noreferrer"
                data-test-subj="externalLink"
              >
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.learnMoreLinkText"
                  defaultMessage="Learn more about CloudFormation"
                />
              </EuiLink>
            ),
          }}
        />
      ),
      lastStep: (
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.credentials"
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
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.steps.organizationLogin"
                defaultMessage="Log in as an {admin} in the management account of the AWS Organization you want to onboard"
                values={{
                  admin: <strong>{'admin'}</strong>,
                }}
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.steps.singleLogin"
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
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.guide.steps.launch"
              defaultMessage="Click the {launchCloudFormation} button below."
              values={{
                launchCloudFormation: <strong>{'Launch CloudFormation'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.region"
              defaultMessage="(Optional) Change the {amazonRegion} in the upper right corner to the region you want to deploy your stack to"
              values={{
                amazonRegion: <strong>{'AWS region'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.accept"
              defaultMessage="Tick the checkbox under {capabilities} in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
                capabilities: (
                  <strong>
                    <FormattedMessage
                      id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.accept.capabilties"
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
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.create"
              defaultMessage="Click {createStack}."
              values={{
                createStack: <strong>{'Create stack'}</strong>,
              }}
            />
          </li>
          <EuiSpacer size="xs" />
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.steps.stackStatus"
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
