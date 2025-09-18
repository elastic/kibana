/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { merge } from 'lodash';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
  PackagePolicy,
} from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { assert } from '../../../common/utils/helpers';
import { useKibana } from '../../common/hooks/use_kibana';
import type {
  CloudSecurityPolicyTemplate,
  PostureInput,
  UpdatePolicy,
} from '../../../common/types_old';
import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_VANILLA,
  CLOUDBEAT_VULN_MGMT_AWS,
  SUPPORTED_POLICY_TEMPLATES,
} from '../../../common/constants';
import { usePackagePolicyList } from '../../common/api/use_package_policy_list';
import {
  getDeploymentType,
  getMaxPackageName,
  getPostureInputHiddenVars,
  getPosturePolicy,
  getPostureType,
  getVulnMgmtCloudFormationDefaultValue,
  hasErrors,
  isPostureInput,
} from './utils';
import { useIsSubscriptionStatusValid } from '../../common/hooks/use_is_subscription_status_valid';

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
  isLoading,
  integration,
  newPolicy,
  packagePolicyList,
  updatePolicy,
  setCanFetchIntegration,
}: {
  isEditPage: boolean;
  isLoading: boolean;
  integration: CloudSecurityPolicyTemplate | undefined;
  newPolicy: NewPackagePolicy;
  packagePolicyList: PackagePolicy[] | undefined;
  updatePolicy: UpdatePolicy;
  setCanFetchIntegration: (canFetch: boolean) => void;
}) => {
  useEffect(() => {
    if (!integration || isEditPage || isLoading) return;

    const packagePolicyListByIntegration = packagePolicyList?.filter(
      (policy) => policy?.vars?.posture?.value === integration
    );

    const currentIntegrationName = getMaxPackageName(integration, packagePolicyListByIntegration);

    /*
     * If 'packagePolicyListByIntegration' is undefined it means policies were still not feteched - Array.isArray(undefined) = false
     * if policie were fetched its an array - the check will return true
     */
    const isPoliciesLoaded = Array.isArray(packagePolicyListByIntegration);

    updatePolicy({
      updatedPolicy: {
        ...newPolicy,
        name: currentIntegrationName,
      },
      isExtensionLoaded: isPoliciesLoaded,
    });
    setCanFetchIntegration(false);
    // since this useEffect should only run on initial mount updatePolicy and newPolicy shouldn't re-trigger it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration, isEditPage, packagePolicyList, isLoading]);
};

const useCloudFormationTemplate = ({
  packageInfo,
  newPolicy,
  updatePolicy,
  isLoading,
}: {
  packageInfo: PackageInfo;
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  isLoading: boolean;
}) => {
  useEffect(() => {
    if (
      isLoading ||
      newPolicy.inputs.some(
        (input) =>
          input.type === CLOUDBEAT_VULN_MGMT_AWS && input.config?.cloud_formation_template_url
      )
    ) {
      return;
    }

    const templateUrl = getVulnMgmtCloudFormationDefaultValue(packageInfo);

    // If the template is not available, do not update the policy
    if (templateUrl === '') return;

    const checkCurrentTemplate = newPolicy?.inputs?.find(
      (i: any) => i.type === CLOUDBEAT_VULN_MGMT_AWS
    )?.config?.cloud_formation_template_url?.value;

    // If the template is already set, do not update the policy
    if (checkCurrentTemplate === templateUrl) return;

    updatePolicy?.({
      updatedPolicy: {
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
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPolicy?.vars?.cloud_formation_template_url, newPolicy, packageInfo]);
};

interface UseLoadFleetExtensionProps {
  newPolicy: NewPackagePolicy;
  onChange: (args: {
    isValid?: boolean;
    updatedPolicy: NewPackagePolicy;
    isExtensionLoaded?: boolean;
  }) => void;
  isEditPage: boolean;
  packageInfo: PackageInfo;
  integrationToEnable?: CloudSecurityPolicyTemplate;
  validationResults?: PackagePolicyValidationResults;
}

const getFormState = (
  policyTemplate?: CloudSecurityPolicyTemplate,
  validationResults?: PackagePolicyValidationResults
): boolean => {
  if (policyTemplate === 'kspm' || policyTemplate === 'vuln_mgmt') {
    return true; // Default to valid for KSPM and Vulnerability Management
  }
  // This a workaround for a bug in Fleet where CSPM is not getting the VALID formState change from Fleet
  if (policyTemplate === 'cspm' && !hasErrors(validationResults)) {
    return true; // CSPM is valid if formState is INVALID but no required vars are invalid
  }
  return false; // Default to false for other cases
};

const DEFAULT_INPUT_TYPE = {
  kspm: CLOUDBEAT_VANILLA,
  cspm: CLOUDBEAT_AWS,
  vuln_mgmt: CLOUDBEAT_VULN_MGMT_AWS,
} as const;

export const useLoadFleetExtension = ({
  newPolicy,
  onChange,
  isEditPage,
  packageInfo,
  integrationToEnable,
  validationResults,
}: UseLoadFleetExtensionProps) => {
  const { cloud, uiSettings } = useKibana().services;
  const integration =
    integrationToEnable &&
    SUPPORTED_POLICY_TEMPLATES.includes(integrationToEnable as CloudSecurityPolicyTemplate)
      ? integrationToEnable
      : undefined;
  const input = getSelectedOption(newPolicy.inputs, integration);
  const enabledPolicyInputCount = newPolicy.inputs.filter((i) => i.enabled).length;

  const [isLoading, setIsLoading] = useState(true);
  const [canFetchIntegration, setCanFetchIntegration] = useState(true);
  const getIsSubscriptionValid = useIsSubscriptionStatusValid();
  const isSubscriptionValid = !!getIsSubscriptionValid.data;
  const isSubscriptionLoading = !!getIsSubscriptionValid.isLoading;
  const isValidFormState = getFormState(input.policy_template, validationResults);
  const setInitialEnabledInputRef = useRef(false);

  const updatePolicy = useCallback(
    ({
      updatedPolicy,
      isExtensionLoaded,
      isValid,
    }: {
      updatedPolicy: NewPackagePolicy;
      isExtensionLoaded?: boolean;
      isValid?: boolean;
    }) => {
      const selectedInput = getSelectedOption(updatedPolicy.inputs, input.policy_template);

      // This is unique to the CSPM policy template, where we need to set the deployment and posture vars
      const newUpdatedPolicy = {
        ...updatedPolicy,
        vars: merge({}, updatedPolicy.vars, {
          deployment: { value: getDeploymentType(selectedInput.type) },
          posture: { value: getPostureType(selectedInput.type) },
        }),
      };
      onChange({
        isValid,
        updatedPolicy: newUpdatedPolicy,
        isExtensionLoaded: isExtensionLoaded !== undefined ? isExtensionLoaded : !isLoading,
      });
    },
    [input.policy_template, onChange, isLoading]
  );

  const setEnabledPolicyInput = useCallback(
    (inputType: PostureInput) => {
      const inputVars = getPostureInputHiddenVars(inputType);
      const policy = getPosturePolicy(newPolicy, inputType, inputVars);
      updatePolicy({ updatedPolicy: policy });
    },
    [newPolicy, updatePolicy]
  );

  const { data: packagePolicyList, refetch } = usePackagePolicyList(packageInfo.name, {
    enabled: canFetchIntegration,
  });

  if (
    !isEditPage &&
    !isLoading &&
    !isSubscriptionLoading &&
    (enabledPolicyInputCount === 0 || enabledPolicyInputCount > 1)
  ) {
    setInitialEnabledInputRef.current = true;
    setEnabledPolicyInput(DEFAULT_INPUT_TYPE[input.policy_template]);
    refetch();
  }

  useCloudFormationTemplate({
    packageInfo,
    updatePolicy,
    newPolicy,
    isLoading,
  });

  usePolicyTemplateInitialName({
    packagePolicyList: packagePolicyList?.items,
    isEditPage,
    isLoading,
    integration: integration as CloudSecurityPolicyTemplate,
    newPolicy,
    updatePolicy,
    setCanFetchIntegration,
  });

  if (!isSubscriptionLoading && isLoading && isValidFormState !== undefined) {
    setIsLoading(false);
  }

  if (isEditPage && isLoading && isSubscriptionValid) {
    setIsLoading(false);
  }

  return {
    cloud,
    isLoading,
    isValid: !!isValidFormState,
    isSubscriptionValid,
    input,
    setEnabledPolicyInput,
    updatePolicy,
    uiSettings,
  };
};
