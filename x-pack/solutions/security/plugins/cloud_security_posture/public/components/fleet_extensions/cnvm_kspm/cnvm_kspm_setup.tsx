/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import {
  EuiAccordion,
  EuiFieldText,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NamespaceComboBox } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/public/types';
import type { PackageInfo } from '@kbn/fleet-plugin/common';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import type { PostureInput, UpdatePolicy } from '../../../../common/types_old';
import { CnvmKspmTemplateInfo } from './cnvm_kspm_info';
import { KspmEksInputSelector } from './kspm_eks_input_selector';
import { EksCredentialsForm } from './eks_credentials_form';
import {
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  CLOUDBEAT_EKS,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../../common/constants';

interface IntegrationInfoFieldsProps {
  fields: Array<{ id: string; value: string; label: React.ReactNode; error: string[] | null }>;
  onChange(field: string, value: string): void;
}

const isVulnMgmtAwsInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyInput & {
  type: typeof CLOUDBEAT_VULN_MGMT_AWS;
  policy_template: typeof VULN_MGMT_POLICY_TEMPLATE;
} => {
  return (
    input.type === CLOUDBEAT_VULN_MGMT_AWS && input.policy_template === VULN_MGMT_POLICY_TEMPLATE
  );
};

const isEksInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyInput & {
  type: typeof CLOUDBEAT_EKS;
  policy_template: typeof KSPM_POLICY_TEMPLATE;
} => {
  return input.type === CLOUDBEAT_EKS && input.policy_template === KSPM_POLICY_TEMPLATE;
};

const isKspmInput = (
  input: NewPackagePolicyInput
): input is NewPackagePolicyInput & {
  type: typeof CLOUDBEAT_VANILLA;
  policy_template: typeof KSPM_POLICY_TEMPLATE;
} => {
  return input.type === CLOUDBEAT_VANILLA && input.policy_template === KSPM_POLICY_TEMPLATE;
};

const IntegrationSettings = ({ onChange, fields }: IntegrationInfoFieldsProps) => (
  <div>
    {fields.map(({ value, id, label, error }) => (
      <EuiFormRow key={id} id={id} fullWidth label={label} isInvalid={!!error} error={error}>
        <EuiFieldText
          isInvalid={!!error}
          fullWidth
          value={value}
          onChange={(event) => onChange(id, event.target.value)}
        />
      </EuiFormRow>
    ))}
  </div>
);

interface CnvmKspmSetupProps {
  isEditPage: boolean;
  input: NewPackagePolicyInput;
  setEnabledPolicyInput: (input: Extract<PostureInput, 'kspm' | 'vuln_mgmt'>) => void;
  updatePolicy: UpdatePolicy;
  newPolicy: NewPackagePolicy;
  validationResults?: PackagePolicyValidationResults;
  packageInfo: PackageInfo;
}

export const CnvmKspmSetup = memo<CnvmKspmSetupProps>(
  ({
    newPolicy,
    packageInfo,
    isEditPage,
    validationResults,
    input,
    setEnabledPolicyInput,
    updatePolicy,
  }) => {
    const { euiTheme } = useEuiTheme();
    const integrationFields = [
      {
        id: 'name',
        value: newPolicy.name,
        error: validationResults?.name || null,
        label: (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationNameLabel"
            defaultMessage="Name"
          />
        ),
      },
      {
        id: 'description',
        value: newPolicy.description || '',
        error: validationResults?.description || null,
        label: (
          <FormattedMessage
            id="xpack.csp.fleetIntegration.integrationDescriptionLabel"
            defaultMessage="Description"
          />
        ),
      },
    ];

    if (isKspmInput(input) || isEksInput(input) || isVulnMgmtAwsInput(input)) {
      return (
        <>
          <CnvmKspmTemplateInfo policyTemplate={input.policy_template} />
          <EuiSpacer size="l" />
          {/* Defines the single enabled input of the active policy template */}
          {(isEksInput(input) || isKspmInput(input)) && (
            <>
              <KspmEksInputSelector
                input={input}
                // @ts-expect-error - TypeScript doesn't know that input.policy_template is a key of DEFAULT_INPUT_TYPE
                setInput={setEnabledPolicyInput}
                disabled={isEditPage}
              />
              <EuiSpacer size="l" />
            </>
          )}

          {isVulnMgmtAwsInput(input) && (
            <>
              <EuiSpacer size="l" />
            </>
          )}
          <IntegrationSettings
            fields={integrationFields}
            onChange={(field, value) =>
              updatePolicy({ updatedPolicy: { ...newPolicy, [field]: value } })
            }
          />

          {/* Namespace selector */}
          {!isVulnMgmtAwsInput(input) && (
            <>
              <EuiSpacer size="m" />
              <EuiAccordion
                id="advancedOptions"
                data-test-subj="advancedOptionsAccordion"
                buttonContent={
                  <EuiText
                    size="xs"
                    color={euiTheme.colors.textPrimary}
                    css={{
                      fontWeight: euiTheme.font.weight.medium,
                    }}
                  >
                    <FormattedMessage
                      id="xpack.csp.fleetIntegration.advancedOptionsLabel"
                      defaultMessage="Advanced options"
                    />
                  </EuiText>
                }
                paddingSize="m"
              >
                <NamespaceComboBox
                  fullWidth
                  namespace={newPolicy.namespace}
                  placeholder="default"
                  isEditPage={isEditPage}
                  validationError={validationResults?.namespace}
                  onNamespaceChange={(namespace: string) => {
                    updatePolicy({ updatedPolicy: { ...newPolicy, namespace } });
                  }}
                  data-test-subj="namespaceInput"
                  labelId="xpack.csp.fleetIntegration.namespaceLabel"
                  helpTextId="securitySolutionPackages.cloudSecurityPosture.cloudSetup.aws.accountType.awsOrganizationDescription"
                />
              </EuiAccordion>
            </>
          )}

          {/* Defines the vars of the enabled input of the active policy template */}
          {isEksInput(input) && (
            <EksCredentialsForm
              input={input}
              newPolicy={newPolicy}
              updatePolicy={updatePolicy}
              packageInfo={packageInfo}
            />
          )}
        </>
      );
    }
  }
);
