/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { type NewPackagePolicy, SetupTechnology } from '@kbn/fleet-plugin/public';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { updatePolicyWithInputs } from '../utils';
import { CspRadioGroupProps, RadioGroup } from '../../csp_boxed_radio_group';
import { AzureAccountType, UpdatePolicy } from '../types';
import {
  AZURE_CREDENTIALS_TYPE,
  AZURE_ORGANIZATION_ACCOUNT,
  AZURE_SINGLE_ACCOUNT,
} from '../constants';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const getAzureAccountTypeOptions = (
  isAzureOrganizationDisabled: boolean
): CspRadioGroupProps['options'] => [
  {
    id: AZURE_ORGANIZATION_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.fleetIntegration.azureAccountType.azureOrganizationLabel',
      {
        defaultMessage: 'Azure Organization',
      }
    ),
    testId: 'azureOrganizationAccountTestId',
    disabled: isAzureOrganizationDisabled,
    tooltip: isAzureOrganizationDisabled
      ? i18n.translate(
          'securitySolutionPackages.fleetIntegration.azureAccountType.azureOrganizationDisabledTooltip',
          {
            defaultMessage: 'Coming Soon',
          }
        )
      : undefined,
  },
  {
    id: AZURE_SINGLE_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.fleetIntegration.azureAccountType.singleAccountLabel',
      {
        defaultMessage: 'Single Subscription',
      }
    ),
    testId: 'azureSingleAccountTestId',
  },
];

const getAzureAccountType = (input: NewPackagePolicyInput): AzureAccountType | undefined =>
  input.streams[0].vars?.['azure.account_type']?.value;

interface AzureAccountTypeSelectProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  disabled: boolean;
  packageInfo: PackageInfo;
  setupTechnology: SetupTechnology;
}
export const AzureAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
  packageInfo,
  setupTechnology,
}: AzureAccountTypeSelectProps) => {
  const { azurePolicyType, azureOrganizationEnabled } = useCloudSetup();
  const azureAccountTypeOptions = getAzureAccountTypeOptions(!azureOrganizationEnabled);
  const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

  if (!getAzureAccountType(input)) {
    updatePolicy({
      updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
        'azure.account_type': {
          value: azureOrganizationEnabled ? AZURE_ORGANIZATION_ACCOUNT : AZURE_SINGLE_ACCOUNT,
          type: 'text',
        },
        'azure.credentials.type': {
          value: isAgentless
            ? AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
            : AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
          type: 'text',
        },
      }),
    });
  }

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.fleetIntegration.azureAccountTypeDescriptionLabel"
          defaultMessage="Select between onboarding an Azure Organization (tenant root group) or a single Azure subscription, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={getAzureAccountType(input) || ''}
        options={azureAccountTypeOptions}
        onChange={(accountType) => {
          updatePolicy({
            updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
              'azure.account_type': {
                value: accountType,
                type: 'text',
              },
            }),
          });
        }}
        size="m"
        name="azureAccountType"
      />
      {getAzureAccountType(input) === AZURE_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.azureAccountType.azureOrganizationDescription"
              defaultMessage="Connect Elastic to every Azure Subscription (current and future) in your environment by providing Elastic with read-only (configuration) access to your Azure Organization (tenant root group)."
            />
          </EuiText>
        </>
      )}
      {getAzureAccountType(input) === AZURE_SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.azureAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single subscription is suitable for an initial POC. To ensure compete coverage, it is strongly recommended to deploy CSPM at the organization (tenant root group) level, which automatically connects all subscriptions (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
