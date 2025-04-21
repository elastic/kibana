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
import type { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import type { AssetInput } from './types';
import { getPolicyTemplateInputOptions, type NewPackagePolicyAssetInput } from './utils';
import { RadioGroup } from './csp_boxed_radio_group';
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
  onChange: PackagePolicyReplaceDefineStepExtensionComponentProps['onChange'];
  setIsValid: (isValid: boolean) => void;
  disabled: boolean;
  setupTechnology: SetupTechnology;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
}

export const PolicyTemplateVarsForm = ({
  input,
  setupTechnology,
  ...props
}: PolicyTemplateVarsFormProps) => {
  const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

  switch (input.type) {
    case 'cloudbeat/asset_inventory_aws':
      if (isAgentless) {
        return <AwsCredentialsFormAgentless {...props} input={input} />;
      }
      return <AwsCredentialsForm {...props} input={input} />;
    case 'cloudbeat/asset_inventory_gcp':
      if (isAgentless) {
        return <GcpCredentialsFormAgentless {...props} input={input} />;
      }
      return <GcpCredentialsForm {...props} input={input} />;
    case 'cloudbeat/asset_inventory_azure':
      if (isAgentless) {
        return <AzureCredentialsFormAgentless {...props} input={input} />;
      }

      return <AzureCredentialsForm {...props} input={input} />;
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
