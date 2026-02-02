/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS } from '@kbn/cloud-security-posture-common';
import { ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common';
import { getAwsCredentialsFormManualOptions } from './get_aws_credentials_form_options';
import type { CspRadioOption } from '../../csp_boxed_radio_group';
import { RadioGroup } from '../../csp_boxed_radio_group';
import { updatePolicyWithInputs } from '../utils';
import { useAwsCredentialsForm } from './aws_hooks';
import { AWS_SETUP_FORMAT } from '../constants';
import { AwsInputVarFields } from './aws_input_var_fields';
import { ReadDocumentation } from '../common';
import { AWSSetupInfoContent } from './aws_setup_info';
import { AwsCredentialTypeSelector } from './aws_credential_type_selector';
import type { AwsSetupFormat, UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const getSetupFormatOptions = (): CspRadioOption[] => [
  {
    id: AWS_SETUP_FORMAT.CLOUD_FORMATION,
    label: 'CloudFormation',
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.CLOUDFORMATION,
  },
  {
    id: AWS_SETUP_FORMAT.MANUAL,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.setupFormatOptions.manual',
      {
        defaultMessage: 'Manual',
      }
    ),
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJECTS.MANUAL,
  },
];

interface AwsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
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
      <EuiCallOut announceOnMount={false} color="warning">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupStep.notSupported"
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
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          {accountType === ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupStep.organizationLogin"
                defaultMessage="Log in as an admin in your organization's AWS management account"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupStep.login"
                defaultMessage="Log in as an admin to the AWS Account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page"
            />
          </li>
          <li>
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormationSetupStep.launch"
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
  const { awsPolicyType, shortName, awsInputFieldMapping } = useCloudSetup();
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

  // Ensure supports_cloud_connector is false for agent-based deployments
  if (newPolicy.supports_cloud_connector || newPolicy.cloud_connector_id) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: false,
        cloud_connector_id: undefined,
      },
    });
  }

  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.gettingStarted.setupInfoContent"
            defaultMessage="Utilize AWS CloudFormation (a built-in AWS tool) or a series of manual steps to set up and deploy {shortName} for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
            values={{
              shortName,
              gettingStartedLink: (
                <EuiLink href={elasticDocLink} target="_blank">
                  <FormattedMessage
                    id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.gettingStarted.gettingStartedLink"
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
              'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.awsCredentialTypeSelectorLabel',
              {
                defaultMessage: 'Preferred manual method',
              }
            )}
            options={getAwsCredentialsFormManualOptions(awsInputFieldMapping)}
            type={awsCredentialsType}
            onChange={(optionId) => {
              updatePolicy({
                updatedPolicy: updatePolicyWithInputs(newPolicy, awsPolicyType, {
                  'aws.credentials.type': { value: optionId },
                }),
              });
            }}
          />
          <EuiSpacer size="m" />
          {group?.info}
          <EuiSpacer size="m" />
          <ReadDocumentation url={elasticDocLink} />
          <EuiSpacer size="l" />
          <AwsInputVarFields
            fields={fields}
            packageInfo={packageInfo}
            onChange={(key, value) => {
              updatePolicy({
                updatedPolicy: updatePolicyWithInputs(newPolicy, awsPolicyType, {
                  [key]: { value },
                }),
              });
            }}
          />
        </>
      )}
      <EuiSpacer />
    </>
  );
};
