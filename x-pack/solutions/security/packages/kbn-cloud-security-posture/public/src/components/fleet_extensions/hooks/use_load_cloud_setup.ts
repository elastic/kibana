/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import semverGte from 'semver/functions/gte';
import { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import { NewPackagePolicy, NewPackagePolicyInput, PackageInfo } from '@kbn/fleet-plugin/common';
import { CSPM_POLICY_TEMPLATE } from '@kbn/cloud-security-posture-common/constants';
import { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import { IUiSettingsClient } from '@kbn/core/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import { CloudSecurityPolicyTemplate, PostureInput, UpdatePolicy } from '../types';
import {
  SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING,
  SUPPORTED_POLICY_TEMPLATES,
} from '../constants';
import {
  getCloudConnectorRemoteRoleTemplate,
  getPostureInputHiddenVars,
  getPosturePolicy,
  hasErrors,
  isPostureInput,
} from '../utils';
import { useSetupTechnology } from './use_setup_technology';

const assert: (condition: unknown, msg?: string) => asserts condition = (
  condition: unknown,
  msg?: string
): asserts condition => {
  if (!condition) {
    throw new Error(msg);
  }
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
  assert(isPostureInput(selectedOption), `Unknown option: ${selectedOption.type}`);

  return selectedOption;
};

interface UseLoadCloudSetupProps {
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  validationResults?: PackagePolicyValidationResults;
  isEditPage: boolean;
  packageInfo: PackageInfo;
  integrationToEnable?: CloudSecurityPolicyTemplate;
  setIntegrationToEnable?: (integration: CloudSecurityPolicyTemplate) => void;
  defaultSetupTechnology?: SetupTechnology;
  isAgentlessEnabled?: boolean;
  handleSetupTechnologyChange?: (setupTechnology: SetupTechnology) => void;
  uiSettings: IUiSettingsClient;
  cloud: CloudSetup;
}

export const useLoadCloudSetup = ({
  newPolicy,
  updatePolicy,
  validationResults,
  isEditPage,
  packageInfo,
  integrationToEnable,
  defaultSetupTechnology,
  isAgentlessEnabled,
  handleSetupTechnologyChange,
  uiSettings,
  cloud,
}: UseLoadCloudSetupProps) => {
  const isServerless = !!cloud.serverless.projectType;
  const integration =
    integrationToEnable &&
    SUPPORTED_POLICY_TEMPLATES.includes(integrationToEnable as CloudSecurityPolicyTemplate)
      ? integrationToEnable
      : undefined;
  const input = getSelectedOption(newPolicy.inputs, integration);
  const hasInvalidRequiredVars = !!hasErrors(validationResults);
  const cloudConnectorsEnabled =
    uiSettings.get(SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING) || false;
  const CLOUD_CONNECTOR_VERSION_ENABLED_ESS = '2.0.0-preview01';

  const { isAgentlessAvailable, setupTechnology, updateSetupTechnology } = useSetupTechnology({
    input,
    isAgentlessEnabled,
    handleSetupTechnologyChange,
    isEditPage,
    defaultSetupTechnology,
  });

  const shouldRenderAgentlessSelector =
    (!isEditPage && isAgentlessAvailable) || (isEditPage && isAgentlessEnabled);

  const cloudConnectorRemoteRoleTemplate = getCloudConnectorRemoteRoleTemplate({
    input,
    cloud,
    packageInfo,
  });

  const showCloudConnectors =
    cloudConnectorsEnabled &&
    !!cloudConnectorRemoteRoleTemplate &&
    semverGte(packageInfo.version, CLOUD_CONNECTOR_VERSION_ENABLED_ESS);

  const setEnabledPolicyInput = useCallback(
    (inputType: PostureInput) => {
      const inputVars = getPostureInputHiddenVars(
        inputType,
        packageInfo,
        setupTechnology,
        showCloudConnectors
      );
      const policy = getPosturePolicy(newPolicy, inputType, inputVars);
      updatePolicy({ updatedPolicy: policy });
    },
    [newPolicy, updatePolicy, packageInfo, setupTechnology, showCloudConnectors]
  );

  return {
    isServerless,
    input,
    setEnabledPolicyInput,
    updatePolicy,
    setupTechnology,
    updateSetupTechnology,
    shouldRenderAgentlessSelector,
    showCloudConnectors,
    hasInvalidRequiredVars,
  };
};
