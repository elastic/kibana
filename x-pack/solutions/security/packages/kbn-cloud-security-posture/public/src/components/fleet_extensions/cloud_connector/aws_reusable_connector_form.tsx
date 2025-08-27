/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiAccordion, EuiSpacer, EuiButton, EuiLink } from '@elastic/eui';
import type { AWSCloudConnectorFormProps } from './types';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_guide';
import {
  updatePolicyWithAwsCloudConnectorCredentials,
  getCloudConnectorRemoteRoleTemplate,
} from './utils';
import { AwsInputVarFields } from '../aws_credentials_form/aws_input_var_fields';
import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';

export const AWSReusableConnectorForm: React.FC<AWSCloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  isEditPage = false,
  cloud,
  updatePolicy,
  hasInvalidRequiredVars = false,
  isOrganization = false,
  templateName,
}) => {
  const cloudConnectorRemoteRoleTemplate = cloud
    ? getCloudConnectorRemoteRoleTemplate({
        input,
        cloud,
        packageInfo,
        templateName,
      })
    : undefined;
  const inputVars = input.streams.find((i) => i.enabled)?.vars;

  const fields = getAwsCloudConnectorsCredentialsFormOptions(inputVars);

  return (
    <>
      <EuiAccordion
        id="cloudFormationAccordianInstructionsReusable"
        data-test-subj="cloudFormationAccordianInstructionsReusable"
        buttonContent={<EuiLink>{'Steps to generate IAM role credentials'}</EuiLink>}
        paddingSize="l"
      >
        <CloudFormationCloudCredentialsGuide isOrganization={isOrganization} />
      </EuiAccordion>
      <EuiSpacer size="l" />
      <EuiButton
        data-test-subj="launchCloudFormationReusableButton"
        target="_blank"
        iconSide="left"
        iconType="launch"
        href={cloudConnectorRemoteRoleTemplate}
      >
        <FormattedMessage id="cloudFormation.launchButton" defaultMessage="Launch CloudFormation" />
      </EuiButton>
      <EuiSpacer size="m" />

      {fields && (
        <AwsInputVarFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            updatePolicy({
              updatedPolicy: updatePolicyWithAwsCloudConnectorCredentials(newPolicy, input, {
                [key]: value,
              }),
            });
          }}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      )}
    </>
  );
};
