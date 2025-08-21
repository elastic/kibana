/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import semverGte from 'semver/functions/gte';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import type {
  NewPackagePolicy,
  NewPackagePolicyInput,
  PackageInfo,
} from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import type { IUiSettingsClient } from '@kbn/core/public';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import {
  getCloudConnectorRemoteRoleTemplate,
  getInputHiddenVars,
  updatePolicyWithInputs,
  hasErrors,
} from '../utils';
import { useSetupTechnology } from './use_setup_technology';
import type { CloudProviders, CloudSetupConfig, UpdatePolicy } from '../types';
import { SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING } from '../constants';

const getSelectedInput = (options: NewPackagePolicyInput[], defaultProviderType: string) => {
  // Looks for the enabled deployment (aka input). By default, all inputs are disabled.
  // Initial state when all inputs are disabled is to choose the default provider type
  const selectedInput =
    options.find((i) => i.enabled) || options.find((i) => i.type === defaultProviderType);

  if (!selectedInput) {
    throw new Error('Failed to determine selected input');
  }
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
  defaultProviderType: string;
  templateName: string;
  config: CloudSetupConfig;
  cloudConnectorEnabledVersion: string;
  getCloudSetupProviderByInputType: (inputType: string) => CloudProviders;
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
  defaultProviderType,
  templateName,
  config,
  getCloudSetupProviderByInputType,
  cloudConnectorEnabledVersion,
}: UseLoadCloudSetupProps) => {
  const isServerless = !!cloud.serverless.projectType;
  const input = getSelectedInput(newPolicy.inputs, defaultProviderType);
  const selectedProvider = getCloudSetupProviderByInputType(input.type);

  const hasInvalidRequiredVars = !!hasErrors(validationResults);
  const cloudConnectorsEnabled =
    uiSettings.get(SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING) || false;

  const { isAgentlessAvailable, setupTechnology, updateSetupTechnology } = useSetupTechnology({
    input,
    isAgentlessEnabled,
    handleSetupTechnologyChange,
    isEditPage,
    defaultSetupTechnology,
    selectedProvider,
  });

  const shouldRenderAgentlessSelector =
    (!isEditPage && isAgentlessAvailable) || (isEditPage && isAgentlessEnabled);

  const cloudConnectorRemoteRoleTemplate = getCloudConnectorRemoteRoleTemplate({
    input,
    cloud,
    packageInfo,
    templateName,
  });

  const showCloudConnectors =
    cloudConnectorsEnabled &&
    !!cloudConnectorRemoteRoleTemplate &&
    semverGte(packageInfo.version, cloudConnectorEnabledVersion);

  const setEnabledPolicyInput = useCallback(
    (provider: CloudProviders) => {
      const inputType = config.providers[provider].type;
      const inputVars = getInputHiddenVars(
        provider,
        packageInfo,
        templateName,
        setupTechnology,
        showCloudConnectors
      );

      const policy = updatePolicyWithInputs(newPolicy, inputType, inputVars);
      updatePolicy({ updatedPolicy: policy });
    },
    [
      config.providers,
      packageInfo,
      templateName,
      setupTechnology,
      showCloudConnectors,
      newPolicy,
      updatePolicy,
    ]
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
