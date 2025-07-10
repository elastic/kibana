/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef } from 'react';
import { i18n } from '@kbn/i18n';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { GCP_ORGANIZATION_ACCOUNT, GCP_SINGLE_ACCOUNT } from './constants';
import { RadioGroup, type AssetRadioGroupProps } from '../asset_boxed_radio_group';
import type { NewPackagePolicyAssetInput } from '../types';
import { gcpField, getInputVarsFields } from './gcp_credential_form';
import { getAssetPolicy } from '../utils';

type GcpAccountType = typeof GCP_SINGLE_ACCOUNT | typeof GCP_ORGANIZATION_ACCOUNT;

const getGcpAccountTypeOptions = (): AssetRadioGroupProps['options'] => [
  {
    id: GCP_ORGANIZATION_ACCOUNT,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.gcpAccountType.gcpOrganizationLabel',
      {
        defaultMessage: 'GCP Organization',
      }
    ),
    testId: 'gcpOrganizationAccountTestId',
  },
  {
    id: GCP_SINGLE_ACCOUNT,
    label: i18n.translate(
      'xpack.securitySolution.assetInventory.fleetIntegration.gcpAccountType.gcpSingleAccountLabel',
      {
        defaultMessage: 'Single Project',
      }
    ),
    testId: 'gcpSingleAccountTestId',
  },
];

const getGcpAccountType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>
): GcpAccountType | undefined => input.streams[0].vars?.['gcp.account_type']?.value;

export const GcpAccountTypeSelect = ({
  input,
  newPolicy,
  updatePolicy,
  disabled,
}: {
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_gcp' }>;
  newPolicy: NewPackagePolicy;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
  disabled: boolean;
}) => {
  const gcpAccountTypeOptions = getGcpAccountTypeOptions();
  /* Create a subset of properties from GcpField to use for hiding value of Organization ID when switching account type from Organization to Single */
  const subsetOfGcpField = (({ 'gcp.organization_id': a }) => ({ 'gcp.organization_id': a }))(
    gcpField.fields
  );

  const fieldsToHide = getInputVarsFields(input, subsetOfGcpField);
  const fieldsSnapshot = useRef({});
  const lastSetupAccessType = useRef<string | undefined>(undefined);
  const onSetupFormatChange = (newSetupFormat: string) => {
    if (newSetupFormat === 'single-account') {
      // We need to store the current manual fields to restore them later
      fieldsSnapshot.current = Object.fromEntries(
        fieldsToHide.map((field) => [field.id, { value: field.value }])
      );
      // We need to store the last manual credentials type to restore it later
      lastSetupAccessType.current = input.streams[0].vars?.['gcp.account_type'].value;

      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.account_type': {
            value: 'single-account',
            type: 'text',
          },
          // Clearing fields from previous setup format to prevent exposing credentials
          // when switching from manual to cloud formation
          ...Object.fromEntries(fieldsToHide.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.account_type': {
            // Restoring last manual credentials type
            value: lastSetupAccessType.current || 'organization-account',
            type: 'text',
          },
          // Restoring fields from manual setup format if any
          ...fieldsSnapshot.current,
        })
      );
    }
  };

  useEffect(() => {
    if (!getGcpAccountType(input)) {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'gcp.account_type': {
            value: GCP_ORGANIZATION_ACCOUNT,
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
          id="xpack.securitySolution.assetInventory.fleetIntegration.gcpAccountTypeDescriptionLabel"
          defaultMessage="Select between single project or organization, and then fill in the name and description to help identify this integration."
        />
      </EuiText>
      <EuiSpacer size="l" />
      <RadioGroup
        disabled={disabled}
        idSelected={getGcpAccountType(input) || ''}
        options={gcpAccountTypeOptions}
        onChange={(accountType) =>
          accountType !== getGcpAccountType(input) && onSetupFormatChange(accountType)
        }
        size="m"
      />
      {getGcpAccountType(input) === GCP_ORGANIZATION_ACCOUNT && (
        <>
          <EuiSpacer size="l" />
          <EuiText color="subdued" size="s">
            <FormattedMessage
              id="xpack.securitySolution.assetInventory.fleetIntegration.gcpAccountType.gcpOrganizationDescription"
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
              id="xpack.securitySolution.assetInventory.fleetIntegration.gcpAccountType.gcpSingleAccountDescription"
              defaultMessage="Deploying to a single project is suitable for an initial POC. To ensure complete coverage, it is strongly recommended to deploy Cloud Asset Discovery at the organization-level, which automatically connects all projects (both current and future)."
            />
          </EuiText>
        </>
      )}
    </>
  );
};
