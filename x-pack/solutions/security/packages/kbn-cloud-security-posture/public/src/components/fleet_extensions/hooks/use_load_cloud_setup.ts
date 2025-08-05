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
import { SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING } from '@kbn/management-settings-ids';
import { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import { IUiSettingsClient } from '@kbn/core/public';
import { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  getCloudConnectorRemoteRoleTemplate,
  getPostureInputHiddenVars,
  getPosturePolicy,
  hasErrors,
} from '../utils';
import { useSetupTechnology } from './use_setup_technology';
import {
  CloudProviders,
  getCloudSetupProviderByInputType,
  getCloudSetupDefaultProvider,
  getCloudSetupProviderConfig,
  isCloudSetupProvider,
} from '../mappings';
import { UpdatePolicy } from '../types';

const assert: (condition: unknown, msg?: string) => asserts condition = (
  condition: unknown,
  msg?: string
): asserts condition => {
  if (!condition) {
    throw new Error(msg);
  }
};

const getSelectedInput = (options: NewPackagePolicyInput[], defaultProvider?: CloudProviders) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the first available of the relevant policyTemplate
  // Default selected policy template is CSPM
  const selectedInput =
    options.find((i) => i.enabled) ||
    options.find(
      (i) => i.type === getCloudSetupProviderConfig(getCloudSetupDefaultProvider()).type
    );

  assert(selectedInput, 'Failed to determine selected option'); // We can't provide a default input without knowing the policy template
  assert(isCloudSetupProvider(selectedInput), `Unknown option: ${selectedInput.type}`);

  return selectedInput;
};

interface UseLoadCloudSetupProps {
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  validationResults?: PackagePolicyValidationResults;
  isEditPage: boolean;
  packageInfo: PackageInfo;
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
  defaultSetupTechnology,
  isAgentlessEnabled,
  handleSetupTechnologyChange,
  uiSettings,
  cloud,
}: UseLoadCloudSetupProps) => {
  const isServerless = !!cloud.serverless.projectType;
  const input = getSelectedInput(newPolicy.inputs);
  const selectedProvider = getCloudSetupProviderByInputType(input.type);

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
    (inputType: CloudProviders) => {
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
    hasInvalidRequiredVars,
    input,
    isServerless,
    selectedProvider,
    setEnabledPolicyInput,
    setupTechnology,
    shouldRenderAgentlessSelector,
    showCloudConnectors,
    updatePolicy,
    updateSetupTechnology,
  };
};
