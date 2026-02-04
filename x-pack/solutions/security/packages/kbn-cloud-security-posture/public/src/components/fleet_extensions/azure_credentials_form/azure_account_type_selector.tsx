/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  AZURE_ORGANIZATION_ACCOUNT_TEST_SUBJ,
  AZURE_SINGLE_ACCOUNT_TEST_SUBJ,
} from '@kbn/cloud-security-posture-common';
import { SINGLE_ACCOUNT, ORGANIZATION_ACCOUNT } from '@kbn/fleet-plugin/common';
import { updatePolicyWithInputs } from '../utils';
import type { CspRadioGroupProps } from '../../csp_boxed_radio_group';
import { RadioGroup } from '../../csp_boxed_radio_group';
import type { AzureAccountType, UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const getAzureAccountTypeOptions = (
  isAzureOrganizationDisabled: boolean
): CspRadioGroupProps['options'] => [
  {
    id: ORGANIZATION_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.accountType.azureOrganizationLabel',
      {
        defaultMessage: 'Azure Organization',
      }
    ),
    testId: AZURE_ORGANIZATION_ACCOUNT_TEST_SUBJ,
    disabled: isAzureOrganizationDisabled,
    tooltip: isAzureOrganizationDisabled
      ? i18n.translate(
          'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.accountType.azureOrganizationDisabledTooltip',
          {
            defaultMessage: 'Coming Soon',
          }
        )
      : undefined,
  },
  {
    id: SINGLE_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.accountType.singleAccountLabel',
      {
        defaultMessage: 'Single Subscription',
      }
    ),
    testId: AZURE_SINGLE_ACCOUNT_TEST_SUBJ,
  },
];

const getAzureAccountType = (input: NewPackagePolicyInput): AzureAccountType | undefined =>
  input.streams[0].vars?.['azure.account_type']?.value;

interface AzureAccountTypeSelectProps {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  disabled: boolean;
}
export const AzureAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
}: AzureAccountTypeSelectProps) => {
  const { azurePolicyType, azureOrganizationEnabled, shortName } = useCloudSetup();

  const organizationDisabled = !azureOrganizationEnabled;
  const azureAccountTypeOptions = getAzureAccountTypeOptions(organizationDisabled);

  const accountType = getAzureAccountType(input);

  if (!accountType || (accountType === ORGANIZATION_ACCOUNT && organizationDisabled)) {
    updatePolicy({
      updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
        'azure.account_type': {
          value: organizationDisabled ? SINGLE_ACCOUNT : ORGANIZATION_ACCOUNT,
          type: 'text',
        },
      }),
    });
  }

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azureAccountTypeDescriptionLabel"
          defaultMessage="Select between onboarding an Azure Organization (tenant root group) or a single Azure subscription, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={getAzureAccountType(input) || ''}
        options={azureAccountTypeOptions}
        onChange={(newAccountType) => {
          updatePolicy({
            updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
              'azure.account_type': {
                value: newAccountType,
                type: 'text',
              },
            }),
          });
        }}
        size="m"
        name="azureAccountType"
      />
      {getAzureAccountType(input) === ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.accountType.organizationDescription"
              defaultMessage="Connect Elastic to every Azure Subscription (current and future) in your environment by providing Elastic with read-only (configuration) access to your Azure Organization (tenant root group)."
            />
          </EuiText>
        </>
      )}
      {getAzureAccountType(input) === SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.cloudSecurityPosture.cloudSetup.azure.accountType.singleDescription"
              defaultMessage="Deploying to a single subscription is suitable for an initial POC. To ensure compete coverage, it is strongly recommended to deploy {shortName} at the organization (tenant root group) level, which automatically connects all subscriptions (both current and future)."
              values={{ shortName }}
            />
          </EuiText>
        </>
      )}
    </>
  );
};
