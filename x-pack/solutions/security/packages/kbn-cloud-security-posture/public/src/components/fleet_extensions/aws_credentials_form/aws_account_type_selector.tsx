/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { updatePolicyWithInputs } from '../utils';
import type { CspRadioGroupProps } from '../../csp_boxed_radio_group';
import { RadioGroup } from '../../csp_boxed_radio_group';
import type { AwsAccountType, UpdatePolicy } from '../types';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT } from '../constants';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const getAwsAccountType = (input: NewPackagePolicyInput): AwsAccountType | undefined =>
  input.streams[0].vars?.['aws.account_type']?.value;

const getAwsAccountTypeOptions = (isAwsOrgDisabled: boolean): CspRadioGroupProps['options'] => [
  {
    id: AWS_ORGANIZATION_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.fleetIntegration.awsAccountType.awsOrganizationLabel',
      {
        defaultMessage: 'AWS Organization',
      }
    ),
    disabled: isAwsOrgDisabled,
    tooltip: isAwsOrgDisabled
      ? i18n.translate(
          'securitySolutionPackages.fleetIntegration.awsAccountType.awsOrganizationDisabledTooltip',
          {
            defaultMessage: 'Supported from integration version 1.5.0 and above',
          }
        )
      : undefined,
    testId: 'awsOrganizationTestId',
  },
  {
    id: AWS_SINGLE_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.fleetIntegration.awsAccountType.singleAccountLabel',
      {
        defaultMessage: 'Single Account',
      }
    ),
    testId: 'awsSingleTestId',
  },
];

export const AwsAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
}: {
  input: NewPackagePolicyInput;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  disabled: boolean;
}) => {
  const { awsOrganizationEnabled, awsPolicyType } = useCloudSetup();

  const awsAccountTypeOptions = useMemo(
    () => getAwsAccountTypeOptions(!awsOrganizationEnabled),
    [awsOrganizationEnabled]
  );

  const awsAccountType = useMemo(() => getAwsAccountType(input), [input]);

  useEffect(() => {
    if (!awsAccountType) {
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(
          newPolicy,
          awsPolicyType,

          {
            'aws.account_type': {
              value: awsOrganizationEnabled ? AWS_ORGANIZATION_ACCOUNT : AWS_SINGLE_ACCOUNT,
              type: 'text',
            },
          }
        ),
      });
    }
  }, [awsAccountType, awsOrganizationEnabled, awsPolicyType, input, newPolicy, updatePolicy]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.fleetIntegration.awsAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      {!awsOrganizationEnabled && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.awsAccountType.awsOrganizationNotSupportedMessage"
              defaultMessage="AWS Organization not supported in current integration version. Please upgrade to the latest version to enable AWS Organizations integration."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}
      <RadioGroup
        disabled={disabled}
        idSelected={getAwsAccountType(input) || ''}
        options={awsAccountTypeOptions}
        onChange={(accountType) => {
          updatePolicy({
            updatedPolicy: updatePolicyWithInputs(newPolicy, awsPolicyType, {
              'aws.account_type': {
                value: accountType,
                type: 'text',
              },
            }),
          });
        }}
        size="m"
        name="accountType"
      />
      {getAwsAccountType(input) === AWS_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.awsAccountType.awsOrganizationDescription"
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
              id="securitySolutionPackages.fleetIntegration.awsAccountType.singleAccountDescription"
              defaultMessage="Deploying to a single account is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all accounts (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
