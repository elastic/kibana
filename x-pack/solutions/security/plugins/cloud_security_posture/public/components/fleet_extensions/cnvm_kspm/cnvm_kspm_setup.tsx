/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useEffect, useState } from 'react';
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
import { PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { assert } from '../../../../common/utils/helpers';
import type { CloudSecurityPolicyTemplate, PostureInput } from '../../../../common/types_old';
import {
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_POLICY_TEMPLATES,
} from '../../../../common/constants';
import { getMaxPackageName, getVulnMgmtCloudFormationDefaultValue, isPostureInput } from '../utils';
import { usePackagePolicyList } from '../../../common/api/use_package_policy_list';
import { CnvmKspmTemplateInfo } from './cnvm_kspm_info';
import { KspmEksInputSelector } from './kspm_eks_input_selector';
import { EksCredentialsForm } from './eks_credentials_form';

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  vuln_mgmt: CLOUDBEAT_VULN_MGMT_AWS,
} as const;

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

const usePolicyTemplateInitialName = ({
  isEditPage,
  integration,
  newPolicy,
  packagePolicyList,
  updatePolicy,
  setCanFetchIntegration,
}: {
  isEditPage: boolean;
  integration: CloudSecurityPolicyTemplate | undefined;
  newPolicy: NewPackagePolicy;
  packagePolicyList: PackagePolicy[] | undefined;
  updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
  setCanFetchIntegration: (canFetch: boolean) => void;
}) => {
  useEffect(() => {
    if (!integration) return;
    if (isEditPage) return;

    const packagePolicyListByIntegration = packagePolicyList?.filter(
      (policy) => policy?.vars?.posture?.value === integration
    );

    const currentIntegrationName = getMaxPackageName(integration, packagePolicyListByIntegration);

    /*
     * If 'packagePolicyListByIntegration' is undefined it means policies were still not feteched - Array.isArray(undefined) = false
     * if policie were fetched its an array - the check will return true
     */
    const isPoliciesLoaded = Array.isArray(packagePolicyListByIntegration);
    updatePolicy(
      {
        ...newPolicy,
        name: currentIntegrationName,
      },
      isPoliciesLoaded
    );
    setCanFetchIntegration(false);
    // since this useEffect should only run on initial mount updatePolicy and newPolicy shouldn't re-trigger it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration, isEditPage, packagePolicyList]);
};

const getSelectedOption = (
  options: NewPackagePolicyInput[],
  policyTemplate: string = CSPM_POLICY_TEMPLATE
) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
  // Default selected policy template is CSPM
  const selectedOption =
    options.find((i) => i.enabled) ||
    options.find((i) => i.policy_template === policyTemplate) ||
    options[0];

  assert(selectedOption, 'Failed to determine selected option'); // We can't provide a default input without knowing the policy template
  assert(isPostureInput(selectedOption), 'Unknown option: ' + selectedOption.type);

  return selectedOption;
};

/**
 * Update CloudFormation template and stack name in the Agent Policy
 * based on the selected policy template
 */
const useCloudFormationTemplate = ({
  packageInfo,
  newPolicy,
  updatePolicy,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: (policy: NewPackagePolicy, isExtensionLoaded?: boolean) => void;
}) => {
  useEffect(() => {
    const templateUrl = getVulnMgmtCloudFormationDefaultValue(packageInfo);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    const checkCurrentTemplate = newPolicy?.inputs?.find(
      (i: any) => i.type === CLOUDBEAT_VULN_MGMT_AWS
    )?.config?.cloud_formation_template_url?.value;

    // If the template is already set, do not update the policy
    if (checkCurrentTemplate === templateUrl) return;

    updatePolicy?.({
      ...newPolicy,
      inputs: newPolicy.inputs.map((input) => {
        if (input.type === CLOUDBEAT_VULN_MGMT_AWS) {
          return {
            ...input,
            config: { cloud_formation_template_url: { value: templateUrl } },
          };
        }
        return input;
      }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_formation_template_url, newPolicy, packageInfo]);
};

interface CnvmKspmSetupProps {
  isEditPage: boolean;
  integrationToEnable: Extract<CloudSecurityPolicyTemplate, 'kspm' | 'vuln_mgmt'>;
  setIsValid: (isValid: boolean) => void;
  isLoading: boolean;
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
    integrationToEnable,
    isLoading,
    setEnabledPolicyInput,
    updatePolicy,
  }) => {
    const integration =
      integrationToEnable &&
      SUPPORTED_POLICY_TEMPLATES.includes(integrationToEnable as CloudSecurityPolicyTemplate)
        ? integrationToEnable
        : undefined;

    const [canFetchIntegration, setCanFetchIntegration] = useState(true);

    const input = getSelectedOption(newPolicy.inputs, integration);

    const { euiTheme } = useEuiTheme();

    const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
      enabled: canFetchIntegration,
    });

    useEffect(() => {
      if (isEditPage) return;
      if (isLoading) return;

      // Pick default input type for policy template.
      // Only 1 enabled input is supported when all inputs are initially enabled.
      // Required for mount only to ensure a single input type is selected
      // This will remove errors in validationResults.vars
      if (input.policy_template in DEFAULT_INPUT_TYPE) {
        setEnabledPolicyInput(
          // @ts-expect-error - TypeScript doesn't know that input.policy_template is a key of DEFAULT_INPUT_TYPE
          DEFAULT_INPUT_TYPE[input.policy_template as keyof typeof DEFAULT_INPUT_TYPE]
        );
      }
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, isEditPage]);

    usePolicyTemplateInitialName({
      packagePolicyList: packagePolicyList?.items,
      isEditPage,
      integration: integration as CloudSecurityPolicyTemplate,
      newPolicy,
      updatePolicy,
      setCanFetchIntegration,
    });

    useCloudFormationTemplate({
      packageInfo,
      updatePolicy,
      newPolicy,
    });

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
