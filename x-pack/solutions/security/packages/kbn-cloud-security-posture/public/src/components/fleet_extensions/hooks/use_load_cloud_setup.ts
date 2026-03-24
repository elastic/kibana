/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import type { PackagePolicyValidationResults } from '@kbn/fleet-plugin/common/services';
import type { NewPackagePolicy, PackageInfo } from '@kbn/fleet-plugin/common';
import type { SetupTechnology } from '@kbn/fleet-plugin/common/types';
import type { CloudSetup } from '@kbn/cloud-plugin/public';
import { getInputHiddenVars, updatePolicyWithInputs, hasErrors, getSelectedInput } from '../utils';
import { useSetupTechnology } from './use_setup_technology';
import type { CloudProviders, CloudSetupConfig, UpdatePolicy } from '../types';

interface UseLoadCloudSetupProps {
  newPolicy: NewPackagePolicy;
  updatePolicy: UpdatePolicy;
  validationResults?: PackagePolicyValidationResults;
  isEditPage: boolean;
  packageInfo: PackageInfo;
  defaultSetupTechnology?: SetupTechnology;
  isAgentlessEnabled?: boolean;
  handleSetupTechnologyChange?: (setupTechnology: SetupTechnology) => void;
  cloud: CloudSetup;
  defaultProviderType: string;
  templateName: string;
  config: CloudSetupConfig;
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
  cloud,
  defaultProviderType,
  templateName,
  config,
  getCloudSetupProviderByInputType,
}: UseLoadCloudSetupProps) => {
  const isServerless = !!cloud.serverless.projectType;
  const input = getSelectedInput(newPolicy.inputs, defaultProviderType);
  const selectedProvider = getCloudSetupProviderByInputType(input.type);

  const hasInvalidRequiredVars = !!hasErrors(validationResults);

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

  const setEnabledPolicyInput = useCallback(
    (provider: CloudProviders, showCloudConnectors: boolean = false) => {
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
    [config.providers, packageInfo, templateName, setupTechnology, newPolicy, updatePolicy]
  );

  return {
    hasInvalidRequiredVars,
    input,
    isServerless,
    selectedProvider,
    setEnabledPolicyInput,
    setupTechnology,
    shouldRenderAgentlessSelector,
    updatePolicy,
    updateSetupTechnology,
  };
};
