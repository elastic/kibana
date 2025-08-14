/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getAwsCredentialsFormManualOptions } from './get_aws_credentials_form_options';
import { CspRadioOption, RadioGroup } from '../csp_boxed_radio_group';
import { getPosturePolicy } from '../utils';
import { useAwsCredentialsForm } from './aws_hooks';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SETUP_FORMAT } from '../constants';
import { AwsInputVarFields } from './aws_input_var_fields';
import { AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ } from './aws_test_subjects';
import { ReadDocumentation } from '../common';
import { AWSSetupInfoContent } from './aws_setup_info';
import { AwsCredentialTypeSelector } from './aws_credential_type_selector';
import { AwsSetupFormat, NewPackagePolicyPostureInput, UpdatePolicy } from '../types';

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: AWS_SETUP_FORMAT.CLOUD_FORMATION,
    label: 'CloudFormation',
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION,
  },
  {
    id: AWS_SETUP_FORMAT.MANUAL,
    label: i18n.translate('securitySolutionPackages.awsIntegration.setupFormatOptions.manual', {
      defaultMessage: 'Manual',
    }),
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL,
  },
];

interface AwsFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  disabled: boolean;
  hasInvalidRequiredVars: boolean;
  isValid: boolean;
}

const CloudFormationSetup = ({
  hasCloudFormationTemplate,
  input,
}: {
  hasCloudFormationTemplate: boolean;
  input: NewPackagePolicyInput;
}) => {
  if (!hasCloudFormationTemplate) {
    return (
      <EuiCallOut color="warning">
        <FormattedMessage
          id="securitySolutionPackages.awsIntegration.cloudFormationSetupStep.notSupported"
          defaultMessage="CloudFormation is not supported on the current Integration version, please upgrade your integration to the latest version to use CloudFormation"
        />
      </EuiCallOut>
    );
  }

  const accountType = input.streams?.[0]?.vars?.['aws.account_type']?.value;

  return (
    <>
      <EuiText color="subdued" size="s">
        <ol
          css={css`
            list-style: auto;
          `}
        >
          <li>
            <FormattedMessage
              id="securitySolutionPackages.awsIntegration.cloudFormationSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          {accountType === AWS_ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.awsIntegration.cloudFormationSetupStep.organizationLogin"
                defaultMessage="Log in as an admin in your organization's AWS management account"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.awsIntegration.cloudFormationSetupStep.login"
                defaultMessage="Log in as an admin to the AWS Account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="securitySolutionPackages.awsIntegration.cloudFormationSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page"
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.awsIntegration.cloudFormationSetupStep.launch"
              defaultMessage="On the subsequent pop-up modal, click the Launch CloudFormation button."
            />
          </li>
        </ol>
      </EuiText>
      <EuiSpacer size="l" />
      <ReadDocumentation url={CLOUD_FORMATION_EXTERNAL_DOC_URL} />
    </>
  );
};

const CLOUD_FORMATION_EXTERNAL_DOC_URL =
  'https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-whatis-howdoesitwork.html';

export const AwsCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled = false,
  hasInvalidRequiredVars,
  isValid,
}: AwsFormProps) => {
  const {
    awsCredentialsType,
    setupFormat,
    group,
    fields,
    elasticDocLink,
    hasCloudFormationTemplate,
    onSetupFormatChange,
  } = useAwsCredentialsForm({
    newPolicy,
    input,
    packageInfo,
    updatePolicy,
    isValid,
  });

  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="securitySolutionPackages.awsIntegration.gettingStarted.setupInfoContent"
            defaultMessage="Utilize AWS CloudFormation (a built-in AWS tool) or a series of manual steps to set up and deploy CSPM for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={elasticDocLink} target="_blank">
                  <FormattedMessage
                    id="securitySolutionPackages.awsIntegration.gettingStarted.setupInfoContentLink"
                    defaultMessage="Getting Started"
                  />
                </EuiLink>
              ),
            }}
          />
        }
      />
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(idSelected: AwsSetupFormat) =>
          idSelected !== setupFormat && onSetupFormatChange(idSelected)
        }
        name="setupFormat"
      />
      <EuiSpacer size="l" />
      {setupFormat === AWS_SETUP_FORMAT.CLOUD_FORMATION && (
        <CloudFormationSetup hasCloudFormationTemplate={hasCloudFormationTemplate} input={input} />
      )}
      {setupFormat === AWS_SETUP_FORMAT.MANUAL && (
        <>
          <AwsCredentialTypeSelector
            disabled={disabled}
            label={i18n.translate(
              'securitySolutionPackages.awsIntegration.awsCredentialTypeSelectorLabel',
              {
                defaultMessage: 'Preferred manual method',
              }
            )}
            options={getAwsCredentialsFormManualOptions()}
            type={awsCredentialsType}
            onChange={(optionId) => {
              updatePolicy({
                updatedPolicy: getPosturePolicy(newPolicy, input.type, {
                  'aws.credentials.type': { value: optionId },
                }),
              });
            }}
          />
          <EuiSpacer size="m" />
          {group.info}
          <EuiSpacer size="m" />
          <ReadDocumentation url={elasticDocLink} />
          <EuiSpacer size="l" />
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
        </>
      )}
      <EuiSpacer />
    </>
  );
};
