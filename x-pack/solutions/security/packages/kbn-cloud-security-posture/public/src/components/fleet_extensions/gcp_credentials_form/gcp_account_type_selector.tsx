/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { EuiCallOut, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { updatePolicyWithInputs, gcpField, getGcpInputVarsFields } from '../utils';
import type { CspRadioGroupProps } from '../../csp_boxed_radio_group';
import { RadioGroup } from '../../csp_boxed_radio_group';
import type { UpdatePolicy } from '../types';
import { GCP_ORGANIZATION_ACCOUNT, GCP_SINGLE_ACCOUNT } from '../constants';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const getGcpAccountTypeOptions = (isGcpOrgDisabled: boolean): CspRadioGroupProps['options'] => [
  {
    id: GCP_ORGANIZATION_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.fleetIntegration.gcpAccountType.gcpOrganizationLabel',
      {
        defaultMessage: 'GCP Organization',
      }
    ),
    disabled: isGcpOrgDisabled,
    tooltip: isGcpOrgDisabled
      ? i18n.translate(
          'securitySolutionPackages.fleetIntegration.gcpAccountType.gcpOrganizationDisabledTooltip',
          {
            defaultMessage: 'Supported from integration version 1.6.0 and above',
          }
        )
      : undefined,
    testId: 'gcpOrganizationAccountTestId',
  },
  {
    id: GCP_SINGLE_ACCOUNT,
    label: i18n.translate(
      'securitySolutionPackages.fleetIntegration.gcpAccountType.gcpSingleAccountLabel',
      {
        defaultMessage: 'Single Project',
      }
    ),
    testId: 'gcpSingleAccountTestId',
  },
];

type GcpAccountType = typeof GCP_SINGLE_ACCOUNT | typeof GCP_ORGANIZATION_ACCOUNT;

const getGcpAccountType = (input: NewPackagePolicyInput): GcpAccountType | undefined =>
  input.streams[0].vars?.['gcp.account_type']?.value;

export const GcpAccountTypeSelect = ({
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
  const { gcpOrganizationEnabled, gcpPolicyType } = useCloudSetup();

  const gcpAccountTypeOptions = useMemo(
    () => getGcpAccountTypeOptions(!gcpOrganizationEnabled),
    [gcpOrganizationEnabled]
  );
  /* Create a subset of properties from GcpField to use for hiding value of Organization ID when switching account type from Organization to Single */
  const subsetOfGcpField = (({ 'gcp.organization_id': a }) => ({ 'gcp.organization_id': a }))(
    gcpField.fields
  );
  const fieldsToHide = getGcpInputVarsFields(input, subsetOfGcpField);
  const fieldsSnapshot = useRef({});
  const lastSetupAccessType = useRef<string | undefined>(undefined);
  const onSetupFormatChange = (newSetupFormat: string) => {
    if (newSetupFormat === GCP_SINGLE_ACCOUNT) {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fieldsToHide.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastSetupAccessType.current = input.streams[0].vars?.['gcp.account_type'].value;
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
          'gcp.account_type': {
            value: 'single-account',
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fieldsToHide.map((field) => [field.id, { value: undefined }])),
        }),
      });
    } else {
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
          'gcp.account_type': {
            // Restoring last manual credentials type
            value: lastSetupAccessType.current || 'organization-account',
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        }),
      });
    }
  };

  useEffect(() => {
    if (!getGcpAccountType(input)) {
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, gcpPolicyType, {
          'gcp.account_type': {
            value: gcpOrganizationEnabled ? GCP_ORGANIZATION_ACCOUNT : GCP_SINGLE_ACCOUNT,
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
          id="securitySolutionPackages.fleetIntegration.gcpAccountTypeDescriptionLabel"
          defaultMessage="Select between single project or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      {!gcpOrganizationEnabled && (
        <>
          <EuiCallOut color="warning">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.gcpAccountType.gcpOrganizationNotSupportedMessage"
              defaultMessage="GCP Organization not supported in current integration version. Please upgrade to the latest version to enable GCP Organizations integration."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}
      <RadioGroup
        disabled={disabled}
        idSelected={getGcpAccountType(input) || ''}
        options={gcpAccountTypeOptions}
        onChange={(accountType) =>
          accountType !== getGcpAccountType(input) && onSetupFormatChange(accountType)
        }
        size="m"
        name="gcpAccountType"
      />
      {getGcpAccountType(input) === GCP_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.gcpAccountType.gcpOrganizationDescription"
              defaultMessage="Connect Elastic to every GCP Project (current and future) in your environment by providing Elastic with read-only (configuration) access to your GCP organization"
            />
          </EuiText>
        </>
      )}
      {getGcpAccountType(input) === GCP_SINGLE_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="securitySolutionPackages.fleetIntegration.gcpAccountType.gcpSingleAccountDescription"
              defaultMessage="Deploying to a single project is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy CSPM at the organization-level, which automatically connects all projects (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
