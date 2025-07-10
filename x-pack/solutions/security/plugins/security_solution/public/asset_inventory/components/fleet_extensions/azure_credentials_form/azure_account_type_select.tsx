/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { type NewPackagePolicy, SetupTechnology } from '@kbn/fleet-plugin/public';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RadioGroup, type AssetRadioGroupProps } from '../asset_boxed_radio_group';
import {
  AZURE_CREDENTIALS_TYPE,
  AZURE_ORGANIZATION_ACCOUNT,
  AZURE_SINGLE_ACCOUNT,
} from './constants';
import type { NewPackagePolicyAssetInput } from '../types';
import type { AzureAccountType } from './types';
import { getAssetPolicy } from '../utils';

const getAzureAccountTypeOptions = (): AssetRadioGroupProps['options'] => [
  {
    id: AZURE_ORGANIZATION_ACCOUNT,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureAccountType.azureOrganizationLabel',
      {
        defaultMessage: 'Azure Organization',
      }
    ),
    testId: 'azureOrganizationAccountTestId',
  },
  {
    id: AZURE_SINGLE_ACCOUNT,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.azureAccountType.singleAccountLabel',
      {
        defaultMessage: 'Single Subscription',
      }
    ),
    testId: 'azureSingleAccountTestId',
  },
];

const getAzureAccountType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_azure' }>
): AzureAccountType | undefined => input.streams[0].vars?.['azure.account_type']?.value;

export const AzureAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
  setupTechnology,
}: {
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_azure' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
  disabled: boolean;
  setupTechnology: SetupTechnology;
}) => {
  const azureAccountTypeOptions = getAzureAccountTypeOptions();
  const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

  useEffect(() => {
    if (!getAzureAccountType(input)) {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'azure.account_type': {
            value: AZURE_ORGANIZATION_ACCOUNT,
            type: 'text',
          },
          'azure.credentials.type': {
            value: isAgentless
              ? AZURE_CREDENTIALS_TYPE.SERVICE_PRINCIPAL_WITH_CLIENT_SECRET
              : AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
            type: 'text',
          },
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, updatePolicy]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.securitySolution.assetInventory.fleetIntegration.azureAccountTypeDescriptionLabel"
          defaultMessage="Select between onboarding an Azure Organization (tenant root group) or a single Azure subscription, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={getAzureAccountType(input) || ''}
        options={azureAccountTypeOptions}
        onChange={(accountType) => {
          updatePolicy(
            getAssetPolicy(newPolicy, input.type, {
              'azure.account_type': {
                value: accountType,
                type: 'text',
              },
            })
          );
        }}
        size="m"
      />
      {getAzureAccountType(input) === AZURE_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.azureAccountType.azureOrganizationDescription"
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
              id="xpack.securitySolution.assetInventory.fleetIntegration.azureAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single subscription is suitable for an initial POC. To ensure compete coverage, it is strongly recommended to deploy Cloud Asset Discovery at the organization (tenant root group) level, which automatically connects all subscriptions (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
