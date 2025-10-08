/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RadioGroup } from '../csp_boxed_radio_group';
import type { CloudProviders } from './types';
import { useCloudSetup } from './hooks/use_cloud_setup_context';

interface ProviderSelectorProps {
  disabled: boolean;
  selectedProvider: CloudProviders;
  setSelectedProvider: (provider: CloudProviders) => void;
}

export const ProviderSelector = ({
  selectedProvider,
  disabled,
  setSelectedProvider,
}: ProviderSelectorProps) => {
  const { templateInputOptions } = useCloudSetup();
  const options = templateInputOptions.map((option) => ({
    ...option,
    label: option.label,
    icon: option.icon,
  }));

  return (
    <RadioGroup
      disabled={disabled}
      idSelected={selectedProvider}
      options={options}
      onChange={(provider) => setSelectedProvider(provider as CloudProviders)}
      size="m"
    />
  );
};
