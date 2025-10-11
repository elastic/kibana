/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { updatePolicyWithInputs, getArmTemplateUrlFromPackage } from '../utils';
import {
  getAzureCredentialsFormOptions,
  getInputVarsFields,
} from './get_azure_credentials_form_options';
import { AZURE_SETUP_FORMAT, AZURE_CREDENTIALS_TYPE } from '../constants';
import type { AzureCredentialsType, AzureSetupFormat, UpdatePolicy } from '../types';
import { useCloudSetup } from '../hooks/use_cloud_setup_context';

const getSetupFormatFromInput = (
  input: NewPackagePolicyInput,
  hasArmTemplateUrl: boolean
): AzureSetupFormat => {
  const credentialsType = getAzureCredentialsType(input);
  if (!credentialsType && hasArmTemplateUrl) {
    return AZURE_SETUP_FORMAT.ARM_TEMPLATE;
  }
  if (credentialsType !== AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE) {
    return AZURE_SETUP_FORMAT.MANUAL;
  }

  return AZURE_SETUP_FORMAT.ARM_TEMPLATE;
};

const getAzureCredentialsType = (input: NewPackagePolicyInput): AzureCredentialsType | undefined =>
  input.streams[0].vars?.['azure.credentials.type']?.value;

export const useAzureCredentialsForm = ({
  newPolicy,
  input,
  packageInfo,
  updatePolicy,
  isValid,
}: {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyInput;
  packageInfo: PackageInfo;
  updatePolicy: UpdatePolicy;
  isValid: boolean;
}) => {
  const { templateName, azureOverviewPath, azurePolicyType } = useCloudSetup();
  const azureCredentialsType: AzureCredentialsType =
    getAzureCredentialsType(input) || AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE;

  const options = getAzureCredentialsFormOptions();

  const hasArmTemplateUrl = !!getArmTemplateUrlFromPackage(packageInfo, templateName);

  const setupFormat = getSetupFormatFromInput(input, hasArmTemplateUrl);

  const group =
    options[azureCredentialsType as keyof typeof options] ||
    options[AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY];

  const fields = getInputVarsFields(input, group.fields);
  const fieldsSnapshot = useRef({});
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  useEffect(() => {
    const isInvalidArmTemplateSelection =
      setupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE && !hasArmTemplateUrl;
    if (isInvalidArmTemplateSelection && isValid) {
      updatePolicy({
        isValid: false,
        updatedPolicy: newPolicy,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setupFormat, input.type]);

  const defaultAzureManualCredentialType = AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY;

  const onSetupFormatChange = (newSetupFormat: AzureSetupFormat) => {
    if (newSetupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE) {
      fieldsSnapshot.current = Object.fromEntries(
        fields?.map((field) => [field.id, { value: field.value }])
      );

      lastManualCredentialsType.current = getAzureCredentialsType(input);

      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
          'azure.credentials.type': {
            value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
            type: 'text',
          },
          ...Object.fromEntries(fields?.map((field) => [field.id, { value: undefined }])),
        }),
      });
    } else {
      updatePolicy({
        updatedPolicy: updatePolicyWithInputs(newPolicy, azurePolicyType, {
          'azure.credentials.type': {
            value: lastManualCredentialsType.current || defaultAzureManualCredentialType,
            type: 'text',
          },
          ...fieldsSnapshot.current,
        }),
      });
    }
  };

  return {
    azureCredentialsType,
    setupFormat,
    group,
    fields,
    documentationLink: azureOverviewPath,
    hasArmTemplateUrl,
    onSetupFormatChange,
  };
};
