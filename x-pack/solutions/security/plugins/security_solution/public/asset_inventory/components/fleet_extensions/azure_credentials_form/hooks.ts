/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import { AZURE_CREDENTIALS_TYPE, AZURE_SETUP_FORMAT, CLOUDBEAT_AZURE } from './constants';
import { assetIntegrationDocsNavigation } from '../../../constants';
import { getArmTemplateUrlFromAssetPackage, getAssetPolicy } from '../utils';
import {
  getAzureCredentialsFormOptions,
  getInputVarsFields,
} from './azure_credentials_form_options';

import type { NewPackagePolicyAssetInput } from '../types';
import type { AzureCredentialsType, AzureSetupFormat } from './types';

const getSetupFormatFromInput = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_azure' }>
): AzureSetupFormat => {
  const credentialsType = getAzureCredentialsType(input);
  if (!credentialsType) {
    return AZURE_SETUP_FORMAT.ARM_TEMPLATE;
  }
  if (credentialsType !== AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE) {
    return AZURE_SETUP_FORMAT.MANUAL;
  }

  return AZURE_SETUP_FORMAT.ARM_TEMPLATE;
};

const getAzureCredentialsType = (
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_azure' }>
): AzureCredentialsType | undefined => input.streams[0].vars?.['azure.credentials.type']?.value;

const getAzureArmTemplateUrl = (newPolicy: NewPackagePolicy) => {
  const template: string | undefined = newPolicy?.inputs?.find((i) => i.type === CLOUDBEAT_AZURE)
    ?.config?.arm_template_url?.value;

  return template || undefined;
};

const updateAzureArmTemplateUrlInPolicy = (
  newPolicy: NewPackagePolicy,
  updatePolicy: (policy: NewPackagePolicy) => void,
  templateUrl: string | undefined
) => {
  updatePolicy?.({
    ...newPolicy,
    inputs: newPolicy.inputs.map((input) => {
      if (input.type === CLOUDBEAT_AZURE) {
        return {
          ...input,
          config: { arm_template_url: { value: templateUrl } },
        };
      }
      return input;
    }),
  });
};

const useUpdateAzureArmTemplate = ({
  packageInfo,
  newPolicy,
  updatePolicy,
  setupFormat,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy) => void;
  setupFormat: AzureSetupFormat;
}) => {
  useEffect(() => {
    const azureArmTemplateUrl = getAzureArmTemplateUrl(newPolicy);

    if (setupFormat === AZURE_SETUP_FORMAT.MANUAL) {
      if (azureArmTemplateUrl) {
        updateAzureArmTemplateUrlInPolicy(newPolicy, updatePolicy, undefined);
      }
      return;
    }
    const templateUrl = getArmTemplateUrlFromAssetPackage(packageInfo);

    if (templateUrl === '') return;

    if (azureArmTemplateUrl === templateUrl) return;

    updateAzureArmTemplateUrlInPolicy(newPolicy, updatePolicy, templateUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.arm_template_url, newPolicy, packageInfo, setupFormat]);
};

export const useAzureCredentialsForm = ({
  newPolicy,
  input,
  packageInfo,
  updatePolicy,
}: {
  newPolicy: NewPackagePolicy;
  input: Extract<NewPackagePolicyAssetInput, { type: 'cloudbeat/asset_inventory_azure' }>;
  packageInfo: PackageInfo;
  updatePolicy: (updatedPolicy: NewPackagePolicy) => void;
}) => {
  const azureCredentialsType: AzureCredentialsType =
    getAzureCredentialsType(input) || AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE;

  const options = getAzureCredentialsFormOptions();

  const setupFormat = getSetupFormatFromInput(input);

  const group = options[azureCredentialsType];
  const fields = getInputVarsFields(input, group.fields);
  const fieldsSnapshot = useRef({});
  const lastManualCredentialsType = useRef<string | undefined>(undefined);

  const documentationLink = assetIntegrationDocsNavigation.azureGetStartedPath;

  useUpdateAzureArmTemplate({
    packageInfo,
    newPolicy,
    updatePolicy,
    setupFormat,
  });

  const defaultAzureManualCredentialType = AZURE_CREDENTIALS_TYPE.MANAGED_IDENTITY;

  const onSetupFormatChange = (newSetupFormat: AzureSetupFormat) => {
    if (newSetupFormat === AZURE_SETUP_FORMAT.ARM_TEMPLATE) {
      fieldsSnapshot.current = Object.fromEntries(
        fields?.map((field) => [field.id, { value: field.value }])
      );

      lastManualCredentialsType.current = getAzureCredentialsType(input);

      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'azure.credentials.type': {
            value: AZURE_CREDENTIALS_TYPE.ARM_TEMPLATE,
            type: 'text',
          },
          ...Object.fromEntries(fields?.map((field) => [field.id, { value: undefined }])),
        })
      );
    } else {
      updatePolicy(
        getAssetPolicy(newPolicy, input.type, {
          'azure.credentials.type': {
            value: lastManualCredentialsType.current || defaultAzureManualCredentialType,
            type: 'text',
          },
          ...fieldsSnapshot.current,
        })
      );
    }
  };

  return {
    azureCredentialsType,
    setupFormat,
    group,
    fields,
    documentationLink,
    onSetupFormatChange,
  };
};
