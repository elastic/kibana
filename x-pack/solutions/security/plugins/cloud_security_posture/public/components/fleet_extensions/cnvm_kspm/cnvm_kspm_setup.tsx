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
import { PackageInfo } from '@kbn/fleet-plugin/common';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import type { PostureInput } from '../../../../common/types_old';
import { CnvmKspmTemplateInfo } from './cnvm_kspm_info';
import { KspmEksInputSelector } from './kspm_eks_input_selector';
import { EksCredentialsForm } from './eks_credentials_form';

interface IntegrationInfoFieldsProps {
  fields: Array<{ id: string; value: string; label: React.ReactNode; error: string[] | null }>;
  onChange(field: string, value: string): void;
}

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
  updatePolicy: (policy: NewPackagePolicy) => void;
  newPolicy: NewPackagePolicy;
  onChange: (opts: {
    isValid: boolean;
    updatedPolicy: NewPackagePolicy;
    isExtensionLoaded?: boolean;
  }) => void;
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

    // useCloudFormationTemplate({
    //   packageInfo,
    //   updatePolicy,
    //   newPolicy,
    // });

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

    return (
      <>
        <CnvmKspmTemplateInfo postureType={input.policy_template} />
        <EuiSpacer size="l" />
        {/* Defines the single enabled input of the active policy template */}
        {input.type !== 'cloudbeat/cis_eks' && input.type !== 'cloudbeat/cis_k8s' ? null : (
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

        {input.type === 'cloudbeat/vuln_mgmt_aws' ? null : (
          <>
            <EuiSpacer size="l" />
          </>
        )}
        <IntegrationSettings
          fields={integrationFields}
          onChange={(field, value) => updatePolicy({ ...newPolicy, [field]: value })}
        />

        {/* Namespace selector */}
        {!input.type.includes('vuln_mgmt') && (
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
                  updatePolicy({ ...newPolicy, namespace });
                }}
                data-test-subj="namespaceInput"
                labelId="xpack.csp.fleetIntegration.namespaceLabel"
                helpTextId="xpack.csp.fleetIntegration.awsAccountType.awsOrganizationDescription"
              />
            </EuiAccordion>
          </>
        )}

        {/* Defines the vars of the enabled input of the active policy template */}
        {input.type === 'cloudbeat/cis_eks' && (
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
);
