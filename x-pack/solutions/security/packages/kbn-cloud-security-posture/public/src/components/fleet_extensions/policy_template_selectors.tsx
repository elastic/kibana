/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/common';
import type {
  PostureInput,
  CloudSecurityPolicyTemplate,
  NewPackagePolicyPostureInput,
} from './types';
import { getPolicyTemplateInputOptions } from './utils';
import { RadioGroup } from './csp_boxed_radio_group';
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
          id="securitySolutionPackages.fleetIntegration.selectIntegrationTypeTitle"
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
        name="policyTemplate"
      />
    </div>
  );
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
      name="policyTemplateInput"
    />
  );
};
