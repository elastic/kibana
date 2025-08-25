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
import { updatePolicyWithAwsCloudConnectorCredentials } from './utils';
import { AwsInputVarFields } from '../aws_credentials_form/aws_input_var_fields';
import { getAwsCloudConnectorsCredentialsFormOptions } from './aws_cloud_connector_options';
import { useCloudConnectorForm } from './hooks/use_cloud_connector_form';

export const AWSCloudConnectorForm: React.FC<AWSCloudConnectorFormProps> = ({
  input,
  newPolicy,
  packageInfo,
  isEditPage = false,
  cloud,
  updatePolicy,
  cloudProvider,
  hasInvalidRequiredVars = false,
  isOrganization = false,
  templateName,
}) => {
  const { cloudConnectorRemoteRoleTemplate } = useCloudConnectorForm({
    newPackagePolicy: newPolicy,
    input,
    cloud,
    cloudProvider: (cloudProvider as 'aws' | 'gcp' | 'azure') || 'aws',
    packageInfo,
    isEditPage,
    templateName,
  });
  const inputVars = input.streams.find((i) => i.enabled)?.vars;

  const fields = getAwsCloudConnectorsCredentialsFormOptions(inputVars);

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
        <FormattedMessage id="cloudFormation.launchButton" defaultMessage="Launch CloudFormation" />
      </EuiButton>
      <EuiSpacer size="m" />

      {fields && (
        <AwsInputVarFields
          fields={fields}
          packageInfo={packageInfo}
          onChange={(key, value) => {
            updatePolicy({
              updatedPolicy: updatePolicyWithAwsCloudConnectorCredentials(newPolicy, {
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
