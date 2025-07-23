/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiAccordion,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { NamespaceComboBox } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NewPackagePolicyInput,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import { PackageInfo, PackagePolicy } from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CloudSetup } from '@kbn/cloud-security-posture';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { useIsSubscriptionStatusValid } from '../../common/hooks/use_is_subscription_status_valid';
import { SubscriptionNotAllowed } from '../subscription_not_allowed';
import { assert } from '../../../common/utils/helpers';
import type { CloudSecurityPolicyTemplate, PostureInput } from '../../../common/types_old';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_POLICY_TEMPLATES,
} from '../../../common/constants';
import {
  getMaxPackageName,
  getPostureInputHiddenVars,
  getPosturePolicy,
  getVulnMgmtCloudFormationDefaultValue,
  isPostureInput,
  POLICY_TEMPLATE_FORM_DTS,
} from './utils';
import {
  PolicyTemplateInfo,
  PolicyTemplateInputSelector,
  PolicyTemplateSelector,
  PolicyTemplateVarsForm,
} from './policy_template_selectors';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';
import { useKibana } from '../../common/hooks/use_kibana';

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
  vuln_mgmt: CLOUDBEAT_VULN_MGMT_AWS,
} as const;

const EditScreenStepTitle = () => (
  <>
    <EuiTitle size="s">
      <h4>
        <FormattedMessage
          id="xpack.csp.fleetIntegration.integrationSettingsTitle"
          defaultMessage="Integration Settings"
        />
      </h4>
    </EuiTitle>
    <EuiSpacer />
  </>
);

export const AWS_SINGLE_ACCOUNT = 'single_account';

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

interface CnvmEksPolicyTemplateProps {
  isEditPage: boolean;
  integrationToEnable: CloudSecurityPolicyTemplate;
  setIsValid: (isValid: boolean) => void;
  isLoading: boolean;
  setEnabledPolicyInput: (input: PostureInput) => void;
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

const CnvmEksPolicyTemplate = memo<CnvmEksPolicyTemplateProps>(
  ({
    newPolicy,
    packageInfo,
    isEditPage,
    validationResults,
    integrationToEnable,
    onChange,
    setIsValid,
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
      setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
      refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoading, input.policy_template, isEditPage]);

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
        <PolicyTemplateInfo postureType={input.policy_template} />
        <EuiSpacer size="l" />
        {/* Defines the single enabled input of the active policy template */}
        {input.type !== 'cloudbeat/cis_eks' && input.type !== 'cloudbeat/cis_k8s' ? null : (
          <>
            <PolicyTemplateInputSelector
              input={input}
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
          <PolicyTemplateVarsForm
            input={input}
            newPolicy={newPolicy}
            updatePolicy={updatePolicy}
            packageInfo={packageInfo}
            onChange={onChange}
            setIsValid={setIsValid}
            disabled={isEditPage}
            isEditPage={isEditPage}
          />
        )}
      </>
    );
  }
);

export const CspPolicyTemplateForm = memo<PackagePolicyReplaceDefineStepExtensionComponentProps>(
  ({
    newPolicy,
    onChange,
    validationResults,
    isEditPage,
    packageInfo,
    handleSetupTechnologyChange,
    isAgentlessEnabled,
    defaultSetupTechnology,
    integrationToEnable,
    setIntegrationToEnable,
  }) => {
    const { cloud, uiSettings } = useKibana().services;
    const isServerless = !!cloud.serverless.projectType;
    const integrationParam = useParams<{ integration: CloudSecurityPolicyTemplate }>().integration;
    const isParentSecurityPosture = !integrationParam;
    const getIsSubscriptionValid = useIsSubscriptionStatusValid();
    const isSubscriptionValid = !!getIsSubscriptionValid.data;
    const integration =
      integrationToEnable &&
      SUPPORTED_POLICY_TEMPLATES.includes(integrationToEnable as CloudSecurityPolicyTemplate)
        ? integrationToEnable
        : undefined;
    const input = getSelectedOption(newPolicy.inputs, integration);

    // search for non null fields of the validation?.vars object
    const validationResultsNonNullFields = Object.keys(validationResults?.vars || {}).filter(
      (key) => (validationResults?.vars || {})[key] !== null
    );

    const [isValid, setIsValid] = useState(true);
    const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);

    const updatePolicy = useCallback(
      (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => {
        onChange({ isValid, updatedPolicy, isExtensionLoaded });
      },
      [onChange, isValid]
    );

    /**
     * - Updates policy inputs by user selection
     * - Updates hidden policy vars
     */
    const setEnabledPolicyInput = useCallback(
      (inputType: PostureInput) => {
        const inputVars = getPostureInputHiddenVars(inputType);
        const policy = getPosturePolicy(newPolicy, inputType, inputVars);
        updatePolicy(policy);
      },
      [newPolicy, updatePolicy]
    );

    // delaying component rendering due to a race condition issue from Fleet
    // TODO: remove this workaround when the following issue is resolved:
    // https://github.com/elastic/kibana/issues/153246
    useEffect(() => {
      // using validation?.vars to know if the newPolicy state was reset due to race condition
      if (validationResultsNonNullFields.length > 0) {
        // Forcing rerender to recover from the validation errors state
        setIsLoading(true);
      }
      setTimeout(() => setIsLoading(false), 200);
    }, [validationResultsNonNullFields]);

    useEffect(() => {
      setIsLoading(getIsSubscriptionValid.isLoading);
    }, [getIsSubscriptionValid.isLoading]);

    useEffect(() => {
      if (!isServerless) {
        setIsValid(isSubscriptionValid);
      }
    }, [isServerless, isSubscriptionValid]);

    if (isLoading) {
      return (
        <EuiFlexGroup justifyContent="spaceAround" data-test-subj={POLICY_TEMPLATE_FORM_DTS.LOADER}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    if (!getIsSubscriptionValid.isLoading && !isSubscriptionValid) {
      return <SubscriptionNotAllowed />;
    }
    // If the input type is one of the cloud providers, we need to render the account type selector
    return (
      <>
        {isEditPage && <EditScreenStepTitle />}
        {isParentSecurityPosture && (
          <>
            <PolicyTemplateSelector
              selectedTemplate={input.policy_template}
              policy={newPolicy}
              setPolicyTemplate={(template) => {
                setEnabledPolicyInput(DEFAULT_INPUT_TYPE[template]);
                setIntegrationToEnable?.(template);
              }}
              disabled={isEditPage}
            />
            <EuiSpacer size="l" />
          </>
        )}
        {isEditPage && (
          <>
            <EuiCallOut
              title={i18n.translate('xpack.csp.fleetIntegration.editWarning.calloutTitle', {
                defaultMessage: 'Modifying Integration Details',
              })}
              color="warning"
              iconType="warning"
            >
              <p>
                <FormattedMessage
                  id="xpack.csp.fleetIntegration.editWarning.calloutDescription"
                  defaultMessage="In order to change the cloud service provider (CSP) you want to monitor, add more accounts, or change where CSPM is deployed (Organization vs Single Account), please add a new CSPM integration."
                />
              </p>
            </EuiCallOut>
            <EuiSpacer size="l" />
          </>
        )}
        {(input.type === 'cloudbeat/cis_aws' ||
          input.type === 'cloudbeat/cis_azure' ||
          input.type === 'cloudbeat/cis_gcp') && (
          <CloudSetup
            newPolicy={newPolicy}
            onChange={onChange}
            packageInfo={packageInfo}
            isEditPage={isEditPage}
            setIntegrationToEnable={setIntegrationToEnable}
            validationResults={validationResults}
            defaultSetupTechnology={defaultSetupTechnology}
            isAgentlessEnabled={isAgentlessEnabled}
            handleSetupTechnologyChange={handleSetupTechnologyChange}
            cloud={cloud}
            uiSettings={uiSettings}
            namespaceSupportEnabled={true}
          />
        )}

        {(input.type === 'cloudbeat/cis_eks' ||
          input.type === 'cloudbeat/cis_k8s' ||
          input.type === 'cloudbeat/vuln_mgmt_aws') && (
          <CnvmEksPolicyTemplate
            newPolicy={newPolicy}
            packageInfo={packageInfo}
            isLoading={isLoading}
            setIsValid={setIsValid}
            setEnabledPolicyInput={setEnabledPolicyInput}
            updatePolicy={updatePolicy}
            validationResults={validationResults}
            isEditPage={isEditPage}
            integrationToEnable={integrationToEnable}
            setIntegrationToEnable={setIntegrationToEnable}
            onChange={onChange}
          />
        )}

        <EuiSpacer />
      </>
    );
  }
);

CspPolicyTemplateForm.displayName = 'CspPolicyTemplateForm';

// eslint-disable-next-line import/no-default-export
export { CspPolicyTemplateForm as default };
