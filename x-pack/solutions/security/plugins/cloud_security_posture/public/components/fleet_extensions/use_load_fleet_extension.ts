/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import { assert } from '../../../common/utils/helpers';
import { useKibana } from '../../common/hooks/use_kibana';
import { CloudSecurityPolicyTemplate, PostureInput } from '../../../common/types_old';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_POLICY_TEMPLATES,
} from '../../../common/constants';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';
import {
  getMaxPackageName,
  getPostureInputHiddenVars,
  getPosturePolicy,
  isPostureInput,
} from './utils';

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

interface UseLoadFleetExtensionProps {
  newPolicy: NewPackagePolicy;
  onChange: (args: {
    isValid: boolean;
    updatedPolicy: NewPackagePolicy;
    isExtensionLoaded?: boolean;
  }) => void;
  validationResults: any; // Replace with actual type if available
  isEditPage: boolean;
  packageInfo: PackageInfo;
  integrationToEnable?: CloudSecurityPolicyTemplate;
  // setIntegrationToEnable?: (integration: CloudSecurityPolicyTemplate) => void;
  isSubscriptionLoading: boolean;
  isSubscriptionValid: boolean;
}

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
  vuln_mgmt: CLOUDBEAT_VULN_MGMT_AWS,
} as const;

export const useLoadFleetExtension = ({
  newPolicy,
  onChange,
  validationResults,
  isEditPage,
  isSubscriptionLoading,
  isSubscriptionValid,
  packageInfo,
  integrationToEnable,
}: // setIntegrationToEnable,
UseLoadFleetExtensionProps) => {
  const { cloud } = useKibana().services;
  const isServerless = !!cloud.serverless.projectType;
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

  // console.log(validationResults);
  // console.log(newPolicy.inputs.map((newInputs) => newInputs.enabled));
  // console.log(input);

  const isValidRef = useRef(true);
  const [isLoading, setIsLoading] = useState(validationResultsNonNullFields.length > 0);
  const [canFetchIntegration, setCanFetchIntegration] = useState(true);

  const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
    enabled: canFetchIntegration,
  });

  const updatePolicy = useCallback(
    (updatedPolicy: NewPackagePolicy, isExtensionLoaded?: boolean) => {
      onChange({
        isValid: isValidRef.current,
        updatedPolicy,
        isExtensionLoaded: isExtensionLoaded !== undefined ? isExtensionLoaded : !isLoading,
      });
    },
    [isLoading, isValidRef, onChange]
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

  usePolicyTemplateInitialName({
    packagePolicyList: packagePolicyList?.items,
    isEditPage,
    integration: integration as CloudSecurityPolicyTemplate,
    newPolicy,
    updatePolicy,
    setCanFetchIntegration,
  });

  // delaying component rendering due to a race condition issue from Fleet
  // TODO: remove this workaround when the following issue is resolved:
  // https://github.com/elastic/kibana/issues/153246
  // useEffect(() => {
  //   // using validation?.vars to know if the newPolicy state was reset due to race condition
  //   if (validationResultsNonNullFields.length > 0) {
  //     // Forcing rerender to recover from the validation errors state
  //     setIsLoading(true);
  //   }
  //   setTimeout(() => setIsLoading(false), 200);
  // }, [validationResultsNonNullFields]);

  if (!isSubscriptionLoading && isLoading) {
    setIsLoading(false);
  }

  if ((isSubscriptionValid && !isValidRef.current) || (!isValidRef.current && isServerless)) {
    isValidRef.current = true;
  }

  if (
    !isEditPage &&
    !isLoading &&
    !isSubscriptionLoading &&
    !newPolicy.inputs.some((i) => i.enabled)
  ) {
    setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
    refetch();
  }

  return {
    isLoading,
    isValid: isValidRef.current,
    isSubscriptionValid,
    input,
    setEnabledPolicyInput,
    updatePolicy,
  };
};
