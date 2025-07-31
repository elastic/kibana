/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiCallOut,
  EuiFormRow,
  EuiHorizontalRule,
  EuiLink,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getAssetPolicy, getAwsCredentialsType } from '../utils';
import type { AssetRadioOption } from '../asset_boxed_radio_group';
import { RadioGroup } from '../asset_boxed_radio_group';
import {
  AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ,
  AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ,
} from '../test_subjects';
import { AWS_CREDENTIALS_TYPE, AWS_ORGANIZATION_ACCOUNT, AWS_SETUP_FORMAT } from './constants';
import type { AwsCredentialsTypeOptions } from './aws_credentials_form_options';
import { getAwsCredentialsFormManualOptions } from './aws_credentials_form_options';
import { AwsInputVarFields } from './aws_input_var_fields';
import type { AwsCredentialsType, AwsSetupFormat } from './types';
import { useAwsCredentialsForm } from './hooks';
import type { NewPackagePolicyAssetInput } from '../types';

interface AWSSetupInfoContentProps {
  info: ReactNode;
}

export const AWSSetupInfoContent = ({ info }: AWSSetupInfoContentProps) => {
  return (
    <>
      <EuiHorizontalRule margin="xl" />
      <EuiTitle size="xs">
        <h2>
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.setupInfoContentTitle"
            defaultMessage="Setup Access"
          />
        </h2>
      </EuiTitle>
      <EuiSpacer size="l" />
      <EuiText color="subdued" size="s">
        {info}
      </EuiText>
    </>
  );
};

const getSetupFormatOptions = (): AssetRadioOption[] => [
  {
    id: AWS_SETUP_FORMAT.CLOUD_FORMATION,
    label: 'CloudFormation',
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.CLOUDFORMATION,
  },
  {
    id: AWS_SETUP_FORMAT.MANUAL,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.setupFormatOptions.manual',
      {
        defaultMessage: 'Manual',
      }
    ),
    testId: AWS_CREDENTIALS_TYPE_OPTIONS_TEST_SUBJ.MANUAL,
  },
];

export const getAgentlessCredentialsType = (
  postureInput: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>,
  showCloudConnectors: boolean
): AwsCredentialsType => {
  const credentialsType = getAwsCredentialsType(postureInput);
  if (
    (!credentialsType && showCloudConnectors) ||
    (credentialsType === AWS_CREDENTIALS_TYPE.CLOUD_FORMATION && showCloudConnectors)
  ) {
    return AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;
  }

  if (credentialsType === AWS_CREDENTIALS_TYPE.CLOUD_FORMATION || !credentialsType) {
    return AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS;
  }

  return credentialsType;
};
export interface AwsFormProps {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  disabled: boolean;
  hasInvalidRequiredVars: boolean;
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
          id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupStep.notSupported"
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
              id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupStep.hostRequirement"
              defaultMessage='Ensure "New hosts" is selected in the "Where to add this integration?" section below'
            />
          </li>
          {accountType === AWS_ORGANIZATION_ACCOUNT ? (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupStep.organizationLogin"
                defaultMessage="Log in as an admin in your organization's AWS management account"
              />
            </li>
          ) : (
            <li>
              <FormattedMessage
                id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupStep.login"
                defaultMessage="Log in as an admin to the AWS Account you want to onboard"
              />
            </li>
          )}
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupStep.save"
              defaultMessage="Click the Save and continue button on the bottom right of this page"
            />
          </li>
          <li>
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupStep.launch"
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

const Link = ({ children, url }: { children: React.ReactNode; url: string }) => (
  <EuiLink
    href={url}
    target="_blank"
    rel="noopener nofollow noreferrer"
    data-test-subj="externalLink"
  >
    {children}
  </EuiLink>
);

export const ReadDocumentation = ({ url }: { url: string }) => {
  return (
    <EuiText color="subdued" size="s">
      <FormattedMessage
        id="xpack.securitySolution.assetInventory.fleetIntegration.awsIntegration.cloudFormationSetupNote"
        defaultMessage="Read the {documentation} for more details"
        values={{
          documentation: (
            <Link url={url}>
              {i18n.translate(
                'xpack.securitySolution.assetInventory.fleetIntegration.documentationLinkText',
                {
                  defaultMessage: 'documentation',
                }
              )}
            </Link>
          ),
        }}
      />
    </EuiText>
  );
};

export const AwsCredentialsForm = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled = false,
  hasInvalidRequiredVars,
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
  });

  return (
    <>
      <AWSSetupInfoContent
        info={
          <FormattedMessage
            id="xpack.securitySolution.assetInventory.fleetIntegration.gettingStarted.setupInfoContent"
            defaultMessage="Utilize AWS CloudFormation (a built-in AWS tool) or a series of manual steps to set up and deploy Cloud Asset Discovery for assessing your AWS environment's assets. Refer to our {gettingStartedLink} guide for details."
            values={{
              gettingStartedLink: (
                <EuiLink href={elasticDocLink} target="_blank">
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
      <RadioGroup
        disabled={disabled}
        size="m"
        options={getSetupFormatOptions()}
        idSelected={setupFormat}
        onChange={(selectedSetupFormat: AwsSetupFormat) =>
          selectedSetupFormat !== setupFormat && onSetupFormatChange(selectedSetupFormat)
        }
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
              'xpack.securitySolution.assetInventory.fleetIntegration.awsCredentialTypeSelectorLabel',
              {
                defaultMessage: 'Preferred manual method',
              }
            )}
            options={getAwsCredentialsFormManualOptions()}
            type={awsCredentialsType}
            onChange={(optionId: string) => {
              updatePolicy(
                getAssetPolicy(newPolicy, input.type, {
                  'aws.credentials.type': { value: optionId },
                })
              );
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
              updatePolicy(getAssetPolicy(newPolicy, input.type, { [key]: { value } }));
            }}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        </>
      )}
      <EuiSpacer />
    </>
  );
};

export const AwsCredentialTypeSelector = ({
  type,
  onChange,
  label,
  options,
  disabled = false,
}: {
  onChange(type: AwsCredentialsType): void;
  type: AwsCredentialsType;
  label: string;
  options: AwsCredentialsTypeOptions;
  disabled?: boolean;
}) => (
  <EuiFormRow fullWidth label={label}>
    <EuiSelect
      fullWidth
      options={options}
      value={type}
      disabled={disabled}
      onChange={(optionElem) => {
        onChange(optionElem.target.value as AwsCredentialsType);
      }}
      data-test-subj={AWS_CREDENTIALS_TYPE_SELECTOR_TEST_SUBJ}
    />
  </EuiFormRow>
);
