/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { PackagePolicyReplaceDefineStepExtensionComponentProps } from '@kbn/fleet-plugin/public/types';
import type { PostureInput, CloudSecurityPolicyTemplate } from './types';
import { getPolicyTemplateInputOptions, type NewPackagePolicyPostureInput } from './utils';
import { RadioGroup } from './csp_boxed_radio_group';
import { AzureCredentialsForm } from './azure_credentials_form/azure_credentials_form';
import { AzureCredentialsFormAgentless } from './azure_credentials_form/azure_credentials_form_agentless';
import { AwsCredentialsForm } from './aws_credentials_form/aws_credentials_form';
import { AwsCredentialsFormAgentless } from './aws_credentials_form/aws_credentials_form_agentless';
import { GcpCredentialsForm } from './gcp_credentials_form/gcp_credential_form';
import { GcpCredentialsFormAgentless } from './gcp_credentials_form/gcp_credentials_form_agentless';

interface PolicyTemplateSelectorProps {
  selectedTemplate: CloudSecurityPolicyTemplate;
  policy: NewPackagePolicy;
  setPolicyTemplate(template: CloudSecurityPolicyTemplate): void;
  disabled: boolean;
}

const getPolicyTemplateLabel = (policyTemplate: CloudSecurityPolicyTemplate) => {
  return policyTemplate.toUpperCase();
};

export const PolicyTemplateSelector = ({
  policy,
  selectedTemplate,
  setPolicyTemplate,
  disabled,
}: PolicyTemplateSelectorProps) => {
  const policyTemplates = new Set(
    policy.inputs.map((input) => input.policy_template as CloudSecurityPolicyTemplate)
  );

  return (
    <div>
      <EuiText color="subdued" size="s">
        <FormattedMessage
          id="xpack.csp.fleetIntegration.selectIntegrationTypeTitle"
          defaultMessage="Select the type of security posture management integration you want to configure"
        />
      </EuiText>
      <EuiSpacer size="m" />
      <RadioGroup
        options={Array.from(policyTemplates, (v) => ({
          id: v,
          label: getPolicyTemplateLabel(v),
          testId: `policy-template-radio-button-${v}`,
        }))}
        idSelected={selectedTemplate}
        onChange={(id: CloudSecurityPolicyTemplate) => setPolicyTemplate(id)}
        disabled={disabled}
      />
    </div>
  );
};

interface PolicyTemplateVarsFormProps {
  newPolicy: NewPackagePolicy;
  input: NewPackagePolicyPostureInput;
  updatePolicy(updatedPolicy: NewPackagePolicy): void;
  packageInfo: PackageInfo;
  onChange: PackagePolicyReplaceDefineStepExtensionComponentProps['onChange'];
  setIsValid: (isValid: boolean) => void;
  disabled: boolean;
  setupTechnology: SetupTechnology;
  isEditPage?: boolean;
  hasInvalidRequiredVars: boolean;
  showCloudConnectors: boolean;
  cloud: CloudSetup | undefined;
}

export const PolicyTemplateVarsForm = ({
  input,
  setupTechnology,
  isEditPage,
  cloud,
  ...props
}: PolicyTemplateVarsFormProps) => {
  const isAgentless = setupTechnology === SetupTechnology.AGENTLESS;

  switch (input.type) {
    case 'cloudbeat/cis_aws':
      if (isAgentless) {
        return (
          <AwsCredentialsFormAgentless
            {...props}
            setupTechnology={setupTechnology}
            input={input}
            isEditPage={isEditPage}
            cloud={cloud}
          />
        );
      }

    //   return <AwsCredentialsForm {...props} input={input} />;
    // case 'cloudbeat/cis_gcp':
    //   if (isAgentless) {
    //     return <GcpCredentialsFormAgentless {...props} input={input} />;
    //   }

    //   return <GcpCredentialsForm {...props} input={input} />;
    // case 'cloudbeat/cis_azure':
    //   if (isAgentless) {
    //     return <AzureCredentialsFormAgentless {...props} input={input} />;
    //   }

    //   return <AzureCredentialsForm {...props} input={input} />;
    default:
      return null;
  }
};

interface Props {
  disabled: boolean;
  input: NewPackagePolicyPostureInput;
  setInput: (inputType: PostureInput) => void;
}

export const PolicyTemplateInputSelector = ({ input, disabled, setInput }: Props) => {
  const baseOptions = getPolicyTemplateInputOptions(input.policy_template);
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
      onChange={(inputType) => setInput(inputType as PostureInput)}
      size="m"
    />
  );
};
