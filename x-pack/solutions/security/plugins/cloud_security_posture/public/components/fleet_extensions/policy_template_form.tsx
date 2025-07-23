/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { NewPackagePolicy } from '@kbn/fleet-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  NewPackagePolicyInput,
  PackagePolicyReplaceDefineStepExtensionComponentProps,
} from '@kbn/fleet-plugin/public/types';
import { CSPM_POLICY_TEMPLATE, KSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common';
import { useParams } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { CloudSetup } from '@kbn/cloud-security-posture';
import { useIsSubscriptionStatusValid } from '../../common/hooks/use_is_subscription_status_valid';
import { SubscriptionNotAllowed } from '../subscription_not_allowed';
import { assert } from '../../../common/utils/helpers';
import type { CloudSecurityPolicyTemplate, PostureInput } from '../../../common/types_old';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_POLICY_TEMPLATES,
  VULN_MGMT_POLICY_TEMPLATE,
} from '../../../common/constants';
import {
  getPostureInputHiddenVars,
  getPosturePolicy,
  isPostureInput,
  POLICY_TEMPLATE_FORM_DTS,
} from './utils';
import { PolicyTemplateSelector } from './policy_template_selectors';
import { useKibana } from '../../common/hooks/use_kibana';
import { CnvmKspmSetup } from './cnvm_kspm/cnvm_kspm_setup';

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
          input.type === 'cloudbeat/vuln_mgmt_aws') &&
          (integrationToEnable === KSPM_POLICY_TEMPLATE ||
            integrationToEnable === VULN_MGMT_POLICY_TEMPLATE) && (
            <CnvmKspmSetup
              newPolicy={newPolicy}
              packageInfo={packageInfo}
              isLoading={isLoading}
              setIsValid={setIsValid}
              setEnabledPolicyInput={setEnabledPolicyInput}
              updatePolicy={updatePolicy}
              validationResults={validationResults}
              isEditPage={isEditPage}
              integrationToEnable={integrationToEnable}
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
