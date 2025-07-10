/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { getAssetPolicy } from '../utils';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT, type CLOUDBEAT_AWS } from './constants';
import type { AssetRadioGroupProps } from '../asset_boxed_radio_group';
import { RadioGroup } from '../asset_boxed_radio_group';
import type { NewPackagePolicyAssetInput } from '../types';

type AwsAccountType = typeof AWS_SINGLE_ACCOUNT | typeof AWS_ORGANIZATION_ACCOUNT;

const getAwsAccountType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_aws' }>
): AwsAccountType | undefined => input.streams[0].vars?.['aws.account_type']?.value;

const getAwsAccountTypeOptions = (): AssetRadioGroupProps['options'] => {
  return [
    {
      id: AWS_ORGANIZATION_ACCOUNT,
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.awsAccountType.awsOrganizationLabel',
        {
          defaultMessage: 'AWS Organization',
        }
      ),
      testId: 'awsOrganizationTestId',
    },
    {
      id: AWS_SINGLE_ACCOUNT,
      label: i18n.translate(
        'xpack.securitySolution.assetInventory.fleetIntegration.awsAccountType.singleAccountLabel',
        {
          defaultMessage: 'Single Account',
        }
      ),
      testId: 'awsSingleTestId',
    },
  ];
};

export const AwsAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
}: {
  input: Extract<NewPackagePolicyAssetInput, { type: typeof CLOUDBEAT_AWS }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
  disabled: boolean;
}) => {
  const awsAccountTypeOptions = getAwsAccountTypeOptions();

  useEffect(() => {
    if (!getAwsAccountType(input)) {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'aws.account_type': {
            value: AWS_ORGANIZATION_ACCOUNT,
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
          id="xpack.securitySolution.assetInventory.fleetIntegration.awsAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={getAwsAccountType(input) || ''}
        options={awsAccountTypeOptions}
        onChange={(accountType) => {
          updatePolicy(
            getAssetPolicy(newPolicy, input.type, {
              'aws.account_type': {
                value: accountType,
                type: 'text',
              },
            })
          );
        }}
        size="m"
      />
      {getAwsAccountType(input) === AWS_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.awsAccountType.awsOrganizationDescription"
              defaultMessage="Connect Elastic to every AWS Account (current and future) in your environment by providing Elastic with read-only (configuration) access to your AWS organization."
            />
          </EuiText>
        </>
      )}
      {getAwsAccountType(input) === AWS_SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.awsAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy Cloud Asset Discovery at the organization-level, which automatically connects all accounts (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
