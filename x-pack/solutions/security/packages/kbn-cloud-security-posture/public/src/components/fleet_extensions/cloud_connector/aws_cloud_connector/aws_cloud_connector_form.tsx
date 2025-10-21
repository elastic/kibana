/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiAccordion, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';
import { type AWSCloudConnectorFormProps } from '../types';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_guide';
import {
  updatePolicyWithAwsCloudConnectorCredentials,
  getCloudConnectorRemoteRoleTemplate,
  updateInputVarsWithCredentials,
} from '../utils';
import { AWS_CLOUD_CONNECTOR_FIELD_NAMES } from '../constants';
import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';
import { CloudConnectorInputFields } from '../form/cloud_connector_input_fields';

export const AWSCloudConnectorForm: React.FC<AWSCloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  cloud,
  updatePolicy,
  hasInvalidRequiredVars = false,
  isOrganization = false,
  templateName,
  credentials,
  setCredentials,
}) => {
  const cloudConnectorRemoteRoleTemplate =
    cloud && templateName
      ? getCloudConnectorRemoteRoleTemplate({
          input,
          cloud,
          packageInfo,
          templateName,
        })
      : undefined;
  const inputVars = input.streams.find((i) => i.enabled)?.vars;

  // Update inputVars with current credentials using utility function or inputVars if no credentials are provided
  const updatedInputVars = credentials
    ? updateInputVarsWithCredentials(inputVars, credentials)
    : inputVars;

  const fields = getAwsCloudConnectorsCredentialsFormOptions(updatedInputVars);

  return (
    <>
      <EuiAccordion
        id="cloudFormationAccordianInstructions"
        data-test-subj={''}
        buttonContent={<EuiLink>{'Steps to assume role'}</EuiLink>}
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
        href={cloudConnectorRemoteRoleTemplate}
      >
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudConnectorSetup.awsCloudConnector.launchButton"
          defaultMessage="Launch CloudFormation"
        />
      </EuiButton>
      <EuiSpacer size="m" />

      {fields && (
        <CloudConnectorInputFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            // Update local credentials state if available
            if (credentials) {
              const updatedCredentials = { ...credentials };
              if (
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.ROLE_ARN ||
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_ROLE_ARN
              ) {
                updatedCredentials.roleArn = value;
              } else if (
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.EXTERNAL_ID ||
                key === AWS_CLOUD_CONNECTOR_FIELD_NAMES.AWS_EXTERNAL_ID
              ) {
                updatedCredentials.externalId = value;
              }
              setCredentials(updatedCredentials);
            } else {
              // Fallback to old method
              updatePolicy({
                updatedPolicy: updatePolicyWithAwsCloudConnectorCredentials(newPolicy, input, {
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
