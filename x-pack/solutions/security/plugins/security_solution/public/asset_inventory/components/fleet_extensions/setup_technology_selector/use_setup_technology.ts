/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useEffect } from 'react';

import type { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS } from '../aws_credentials_form/constants';
import { CLOUDBEAT_GCP } from '../gcp_credentials_form/constants';
import { CLOUDBEAT_AZURE } from '../azure_credentials_form/constants';

export const useSetupTechnology = ({
  input,
  isAgentlessEnabled,
  handleSetupTechnologyChange,
  defaultSetupTechnology,
  isEditPage,
}: {
  input: NewPackagePolicyInput;
  isAgentlessEnabled?: boolean;
  handleSetupTechnologyChange?: (value: SetupTechnology) => void;
  defaultSetupTechnology?: SetupTechnology;
  isEditPage?: boolean;
}) => {
  const isAssetAws = input.type === CLOUDBEAT_AWS;
  const isAssetGcp = input.type === CLOUDBEAT_GCP;
  const isAssetAzure = input.type === CLOUDBEAT_AZURE;
  const isAgentlessSupportedForCloudProvider = isAssetAws || isAssetGcp || isAssetAzure;
  const isAgentlessAvailable = isAgentlessSupportedForCloudProvider && isAgentlessEnabled;
  const defaultEditSetupTechnology =
    isEditPage && isAgentlessAvailable ? SetupTechnology.AGENTLESS : SetupTechnology.AGENT_BASED;

  const [setupTechnology, setSetupTechnology] = useState<SetupTechnology>(
    defaultSetupTechnology || defaultEditSetupTechnology
  );

  // Default setup technology may update asynchrounously as data loads from
  // parent component, or when integration is changed, so re-set state if it changes
  useEffect(() => {
    setSetupTechnology(defaultSetupTechnology || defaultEditSetupTechnology);
  }, [defaultEditSetupTechnology, defaultSetupTechnology]);

  const updateSetupTechnology = (value: SetupTechnology) => {
    setSetupTechnology(value);
    if (handleSetupTechnologyChange) {
      handleSetupTechnologyChange(value);
    }
  };

  return {
    isAgentlessAvailable,
    setupTechnology,
    setSetupTechnology,
    updateSetupTechnology,
  };
};
