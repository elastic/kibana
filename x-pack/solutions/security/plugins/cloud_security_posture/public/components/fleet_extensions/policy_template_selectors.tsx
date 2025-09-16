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
import { RadioGroup } from '@kbn/cloud-security-posture';
import { VULN_MGMT_POLICY_TEMPLATE, CNVM_POLICY_TEMPLATE } from '../../../common/constants';
import type { CloudSecurityPolicyTemplate } from '../../../common/types_old';
interface PolicyTemplateSelectorProps {
  selectedTemplate: CloudSecurityPolicyTemplate;
  policy: NewPackagePolicy;
  setPolicyTemplate(template: CloudSecurityPolicyTemplate): void;
  disabled: boolean;
}

const getPolicyTemplateLabel = (policyTemplate: CloudSecurityPolicyTemplate) => {
  if (policyTemplate === VULN_MGMT_POLICY_TEMPLATE) {
    return CNVM_POLICY_TEMPLATE.toUpperCase();
  }
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
        name="policyTemplate"
      />
    </div>
  );
};
