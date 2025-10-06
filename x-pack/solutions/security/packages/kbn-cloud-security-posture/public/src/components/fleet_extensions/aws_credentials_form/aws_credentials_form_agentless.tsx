/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiAccordion, EuiButton, EuiCallOut, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/public';
import {
  AWS_CLOUD_FORMATION_ACCORDION_TEST_SUBJ,
  AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ,
  ORGANIZATION_ACCOUNT,
  SINGLE_ACCOUNT,
} from '@kbn/cloud-security-posture-common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR,
  SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS,
  AWS_CREDENTIALS_TYPE,
  AWS_PROVIDER,
} from '../constants';
import {
  getAgentlessCredentialsType,
  getAwsAgentlessFormOptions,
  getAwsCloudConnectorsCredentialsFormOptions,
  getAwsCredentialsCloudConnectorsFormAgentlessOptions,
  getAwsCredentialsFormAgentlessOptions,
  getInputVarsFields,
} from './get_aws_credentials_form_options';
import {
  getTemplateUrlFromPackageInfo,
  getCloudCredentialVarsConfig,
  updatePolicyWithInputs,
  getAwsCredentialsType,
} from '../utils';
import { AwsInputVarFields } from './aws_input_var_fields';
import { AWSSetupInfoContent } from './aws_setup_info';
import { AwsCredentialTypeSelector } from './aws_credential_type_selector';

import { ReadDocumentation } from '../common';
import { CloudFormationCloudCredentialsGuide } from './aws_cloud_formation_credential_guide';
import type { AwsInputFieldMapping, UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

import { CloudConnectorSetup } from '../cloud_connector/cloud_connector_setup';

interface AwsAgentlessFormProps {
  cloud: CloudSetup;
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isEditPage?: boolean;
  setupTechnology: SetupTechnology;
  hasInvalidRequiredVars: boolean;
}

const getSelectorOptions = (
  isEditPage: boolean | undefined,
  awsCredentialsType: string | undefined,
  isAwsCloudConnectorEnabled: boolean,
  awsInputFieldMapping: AwsInputFieldMapping | undefined
) => {
  if (isEditPage && AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS !== awsCredentialsType) {
    return getAwsCredentialsFormAgentlessOptions(awsInputFieldMapping);
  }
  if (isAwsCloudConnectorEnabled) {
    return getAwsCredentialsCloudConnectorsFormAgentlessOptions(awsInputFieldMapping);
  }
  return getAwsCredentialsFormAgentlessOptions(awsInputFieldMapping);
};

const updatePolicyCloudConnectorSupport = (
  awsCredentialsType: string,
  newPolicy: NewPackagePolicy,
  updatePolicy: UpdatePolicy,
  input: NewPackagePolicyInput,
  awsPolicyType: string
) => {
  if (!getAwsCredentialsType(input)) {
    updatePolicy({
      updatedPolicy: {
        ...updatePolicyWithInputs(newPolicy, awsPolicyType, {
          'aws.credentials.type': {
            value: awsCredentialsType,
            type: 'text',
          },
          'aws.supports_cloud_connectors': {
            value: awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
            type: 'bool',
          },
        }),
      },
    });
    return;
  }

  if (awsCredentialsType === 'cloud_connectors' && !newPolicy.supports_cloud_connector) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: true,
      },
    });
  } else if (awsCredentialsType !== 'cloud_connectors' && newPolicy.supports_cloud_connector) {
    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        supports_cloud_connector: false,
      },
    });
  }
};

const getCloudFormationConfig = (
  awsCredentialsType: string,
  automationCredentialTemplate: string | undefined,
  awsCloudConnectorRemoteRoleTemplate: string | undefined
) => {
  const settings = {
    [AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS]: {
      accordianTitleLink: <EuiLink>{'Steps to Generate AWS Account Credentials'}</EuiLink>,
      templateUrl: automationCredentialTemplate,
    },
    [AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS]: {
      accordianTitleLink: <EuiLink>{'Steps to Generate Cloud Connection'}</EuiLink>,
      templateUrl: awsCloudConnectorRemoteRoleTemplate,
    },
  };

  const isSupported =
    awsCredentialsType === AWS_CREDENTIALS_TYPE.DIRECT_ACCESS_KEYS ||
    awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS;

  const currentSettings = settings[awsCredentialsType as keyof typeof settings];

  return {
    settings,
    isSupported,
    accordionTitleLink: currentSettings?.accordianTitleLink || '',
    templateUrl: currentSettings?.templateUrl || '',
  };
};

// TODO: Extract cloud connector logic into separate component
export const AwsCredentialsFormAgentless = ({
  cloud,
  input,
  newPolicy,
  packageInfo,
  updatePolicy,
  isEditPage,
  setupTechnology,
  hasInvalidRequiredVars,
}: AwsAgentlessFormProps) => {
  const {
    awsOverviewPath,
    awsPolicyType,
    awsInputFieldMapping,
    templateName,
    showCloudTemplates,
    shortName,
    awsCloudConnectorRemoteRoleTemplate,
    isAwsCloudConnectorEnabled,
  } = useCloudSetup();

  const accountType = input?.streams?.[0].vars?.['aws.account_type']?.value ?? SINGLE_ACCOUNT;
  const awsCredentialsType = getAgentlessCredentialsType(input, isAwsCloudConnectorEnabled);

  updatePolicyCloudConnectorSupport(
    awsCredentialsType,
    newPolicy,
    updatePolicy,
    input,
    awsPolicyType
  );

  const automationCredentialTemplate = getTemplateUrlFromPackageInfo(
    packageInfo,
    templateName ?? '',
    SUPPORTED_TEMPLATES_URL_FROM_PACKAGE_INFO_INPUT_VARS.CLOUD_FORMATION_CREDENTIALS
  )?.replace(TEMPLATE_URL_ACCOUNT_TYPE_ENV_VAR, accountType);

  const cloudFormationConfig = getCloudFormationConfig(
    awsCredentialsType,
    automationCredentialTemplate,
    awsCloudConnectorRemoteRoleTemplate
  );

  const isOrganization = accountType === ORGANIZATION_ACCOUNT;
  const agentlessCredentialFormGroups = isAwsCloudConnectorEnabled
    ? getAwsCloudConnectorsCredentialsFormOptions(awsInputFieldMapping)
    : getAwsAgentlessFormOptions(awsInputFieldMapping);

  const group =
    agentlessCredentialFormGroups[awsCredentialsType as keyof typeof agentlessCredentialFormGroups];
  const fields = getInputVarsFields(input, group.fields);

  const selectorOptions = getSelectorOptions(
    isEditPage,
    awsCredentialsType,
    isAwsCloudConnectorEnabled,
    awsInputFieldMapping
  );

  const disabled =
    isEditPage &&
    awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS &&
    isAwsCloudConnectorEnabled;

  const showCloudFormationAccordion = cloudFormationConfig.isSupported && showCloudTemplates;

  return (
    <>
      <AWSSetupInfoContent
        info={
          isAwsCloudConnectorEnabled ? (
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.gettingStarted.setupInfoContentAgentlessCloudConnector"
              defaultMessage="Utilize AWS Access Keys or Cloud Connector to set up and deploy {shortName} for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
              values={{
                shortName,
                gettingStartedLink: (
                  <EuiLink href={awsOverviewPath} target="_blank">
                    <FormattedMessage
                      id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.gettingStarted.gettingStartedLink"
                      defaultMessage="Getting Started"
                    />
                  </EuiLink>
                ),
              }}
            />
          ) : (
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.gettingStarted.setupInfoContent.agentlessAccessKeys"
              defaultMessage="Utilize AWS Access Keys to set up and deploy {shortName} for assessing your AWS environment's security posture. Refer to our {gettingStartedLink} guide for details."
              values={{
                shortName,
                gettingStartedLink: (
                  <EuiLink href={awsOverviewPath} target="_blank">
                    <FormattedMessage
                      id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.gettingStarted.gettingStartedLink"
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
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.awsCredentialTypeSelectorLabelAgentless',
          {
            defaultMessage: 'Preferred method',
          }
        )}
        type={awsCredentialsType}
        options={selectorOptions}
        disabled={!!disabled}
        onChange={(optionId) => {
          const newPackagePolicy = {
            ...newPolicy,
            supports_cloud_connector: optionId === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS,
          };
          updatePolicy({
            updatedPolicy: updatePolicyWithInputs(
              newPackagePolicy,
              awsPolicyType,
              getCloudCredentialVarsConfig({
                setupTechnology,
                optionId,
                showCloudConnectors: isAwsCloudConnectorEnabled,
                provider: AWS_PROVIDER,
              })
            ),
          });
        }}
      />
      <EuiSpacer size="m" />
      {awsCredentialsType !== AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS && (
        <>
          {!showCloudTemplates && cloudFormationConfig.isSupported && (
            <>
              <EuiCallOut announceOnMount color="warning">
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.supportedMessage"
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
                data-test-subj={AWS_CLOUD_FORMATION_ACCORDION_TEST_SUBJ}
                buttonContent={cloudFormationConfig.accordionTitleLink}
                paddingSize="l"
              >
                <CloudFormationCloudCredentialsGuide
                  isOrganization={isOrganization}
                  credentialType={awsCredentialsType as 'cloud_connectors' | 'direct_access_keys'}
                />
              </EuiAccordion>
              <EuiSpacer size="l" />
              <EuiButton
                data-test-subj={AWS_LAUNCH_CLOUD_FORMATION_TEST_SUBJ}
                target="_blank"
                iconSide="left"
                iconType="launch"
                href={cloudFormationConfig.templateUrl}
              >
                <FormattedMessage
                  id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.cloudFormation.launchButton"
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
              const updatedPolicy = updatePolicyWithInputs(newPolicy, awsPolicyType, {
                [key]: { value },
              });
              updatePolicy({
                updatedPolicy,
              });
            }}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
          />
        </>
      )}

      {awsCredentialsType === AWS_CREDENTIALS_TYPE.CLOUD_CONNECTORS && (
        <CloudConnectorSetup
          templateName={templateName}
          input={input}
          newPolicy={newPolicy}
          packageInfo={packageInfo}
          updatePolicy={updatePolicy}
          isEditPage={isEditPage}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          cloud={cloud}
          cloudProvider={AWS_PROVIDER}
        />
      )}
      <ReadDocumentation url={awsOverviewPath} />
    </>
  );
};
