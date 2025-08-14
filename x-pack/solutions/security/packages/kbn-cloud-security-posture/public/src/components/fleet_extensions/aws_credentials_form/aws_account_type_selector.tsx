/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import semverCompare from 'semver/functions/compare';
import semverValid from 'semver/functions/valid';
import { PackageInfo } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { getPosturePolicy } from '../utils';
import { CspRadioGroupProps, RadioGroup } from '../csp_boxed_radio_group';
import { AwsAccountType, NewPackagePolicyPostureInput, UpdatePolicy } from '../types';
import { AWS_ORGANIZATION_ACCOUNT, AWS_SINGLE_ACCOUNT } from '../constants';

const AWS_ORG_MINIMUM_PACKAGE_VERSION = '1.5.0-preview20';
const getAwsAccountType = (
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>
): AwsAccountType | undefined => input.streams[0].vars?.['aws.account_type']?.value;

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
  input: Extract<NewPackagePolicyPostureInput, { type: 'cloudbeat/cis_aws' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  packageInfo: PackageInfo;
  disabled: boolean;
}) => {
  // This will disable the aws org option for any version below 1.5.0-preview20 which introduced support for account_type. https://github.com/elastic/integrations/pull/6682
  const isValidSemantic = semverValid(packageInfo.version);
  const isAwsOrgDisabled = isValidSemantic
    ? semverCompare(packageInfo.version, AWS_ORG_MINIMUM_PACKAGE_VERSION) < 0
    : true;

  const awsAccountTypeOptions = useMemo(
    () => getAwsAccountTypeOptions(isAwsOrgDisabled),
    [isAwsOrgDisabled]
  );

  useEffect(() => {
    if (!getAwsAccountType(input)) {
      updatePolicy({
        updatedPolicy: getPosturePolicy(newPolicy, input.type, {
          'aws.account_type': {
            value: isAwsOrgDisabled ? AWS_SINGLE_ACCOUNT : AWS_ORGANIZATION_ACCOUNT,
            type: 'text',
          },
        }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, updatePolicy]);

  return (
    <>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="securitySolutionPackages.fleetIntegration.awsAccountTypeDescriptionLabel"
          defaultMessage="Select between single account or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      {isAwsOrgDisabled && (
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
            updatedPolicy: getPosturePolicy(newPolicy, input.type, {
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
