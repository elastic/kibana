/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export interface CloudFormationCloudCredentialsGuideProps {
  isOrganization?: boolean;
}

export const CloudFormationCloudCredentialsGuide: React.FC<
  CloudFormationCloudCredentialsGuideProps
> = ({ isOrganization = false }) => {
  const CLOUD_FORMATION_EXTERNAL_DOC_URL =
    'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html';

  return (
    <div>
      <EuiText size="s" color="subdued">
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
      </EuiText>
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
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.launch"
              defaultMessage="Click the {launchCloudFormation} button below."
              values={{
                launchCloudFormation: <strong>{'Launch CloudFormation'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.region"
              defaultMessage="(Optional) Change the {amazonRegion} in the upper right corner to the region you want to deploy your stack to"
              values={{
                amazonRegion: <strong>{'AWS region'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.accept"
              defaultMessage="Tick the checkbox under {capabilities} in the opened CloudFormation stack review form: {acknowledge}"
              values={{
                acknowledge: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.accept.acknowledge"
                      defaultMessage="I acknowledge that AWS CloudFormation might create IAM resources."
                    />
                  </strong>
                ),
                capabilities: (
                  <strong>
                    <FormattedMessage
                      id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.accept.capabilties"
                      defaultMessage="capabilities"
                    />
                  </strong>
                ),
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.create"
              defaultMessage="Click {createStack}."
              values={{
                createStack: <strong>{'Create stack'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.guide.steps.stackStatus"
              defaultMessage="Once stack status is {createComplete} then click the Outputs tab"
              values={{
                createComplete: <strong>{'CREATE_COMPLETE'}</strong>,
              }}
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.agentlessForm.cloudFormation.steps.credentials"
              defaultMessage="Copy {role} and {external_id} then paste the role credentials below"
              values={{
                role: <strong>{'Role ARN'}</strong>,
                external_id: <strong>{'External ID'}</strong>,
              }}
            />
          </li>
        </ol>
      </EuiText>
    </div>
  );
};
