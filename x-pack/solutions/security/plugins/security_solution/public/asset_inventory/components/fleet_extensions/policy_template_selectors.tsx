/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import type { AssetInput, NewPackagePolicyAssetInput } from './types';
import { getPolicyTemplateInputOptions } from './utils';
import { RadioGroup } from './asset_boxed_radio_group';
import { AzureCredentialsForm } from './azure_credentials_form/azure_credentials_form';
import { AzureCredentialsFormAgentless } from './azure_credentials_form/azure_credentials_form_agentless';
import { AwsCredentialsForm } from './aws_credentials_form/aws_credentials_form';
import { AwsCredentialsFormAgentless } from './aws_credentials_form/aws_credentials_form_agentless';
import { GcpCredentialsForm } from './gcp_credentials_form/gcp_credential_form';
import { GcpCredentialsFormAgentless } from './gcp_credentials_form/gcp_credentials_form_agentless';

export interface PolicyTemplateVarsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyAssetInput;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  disabled: boolean;
  setupTechnology: SetupTechnology;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  showCloudConnectors: boolean;
}

export const PolicyTemplateVarsForm = ({
  input,
  setupTechnology,
  newPolicy,
  updatePolicy,
  packageInfo,
  disabled,
  isEditPage,
  hasInvalidRequiredVars,
  showCloudConnectors,
}: PolicyTemplateVarsFormProps) => {
  const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

  switch (input.type) {
    case 'cloudbeat/asset_inventory_aws':
      if (isAgentless) {
        return (
          <AwsCredentialsFormAgentless
            newPolicy={newPolicy}
            setupTechnology={setupTechnology}
            updatePolicy={updatePolicy}
            isEditPage={isEditPage}
            packageInfo={packageInfo}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            input={input}
            showCloudConnectors={showCloudConnectors}
          />
        );
      }
      return (
        <AwsCredentialsForm
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          disabled={disabled}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          input={input}
        />
      );
    case 'cloudbeat/asset_inventory_gcp':
      if (isAgentless) {
        return (
          <GcpCredentialsFormAgentless
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            disabled={disabled}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            input={input}
          />
        );
      }
      return (
        <GcpCredentialsForm
          input={input}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          disabled={disabled}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
          isEditPage={isEditPage}
        />
      );
    case 'cloudbeat/asset_inventory_azure':
      if (isAgentless) {
        return (
          <AzureCredentialsFormAgentless
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            hasInvalidRequiredVars={hasInvalidRequiredVars}
            input={input}
            disabled={disabled}
          />
        );
      }

      return (
        <AzureCredentialsForm
          input={input}
          newPolicy={newPolicy}
          updatePolicy={updatePolicy}
          packageInfo={packageInfo}
          disabled={disabled}
          hasInvalidRequiredVars={hasInvalidRequiredVars}
        />
      );
    default:
      return null;
  }
};

interface PolicyTemplateInputSelectorProps {
  disabled: boolean;
  input: NewPackagePolicyInput;
  setInput: (inputType: AssetInput) => void;
}

export const PolicyTemplateInputSelector = ({
  input,
  disabled,
  setInput,
}: PolicyTemplateInputSelectorProps) => {
  const baseOptions = getPolicyTemplateInputOptions();
  const options = baseOptions.map((option) => ({
    ...option,
    disabled: option.disabled || disabled,
    label: option.label,
    icon: option.icon,
  }));

  return (
    <RadioGroup
      disabled={disabled}
      idSelected={input.type}
      options={options}
      onChange={(inputType) => setInput(inputType as AssetInput)}
      size="m"
    />
  );
};
