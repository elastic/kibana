/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetCustomScripts } from '../../../hooks/custom_scripts/use_get_custom_scripts';
import { BaseArgumentSelector } from '../shared/base_argument_selector';
import { CUSTOM_SCRIPTS_CONFIG } from '../shared/constants';
import { useGenericErrorToast } from '../shared/hooks';
import { transformCustomScriptsToOptions } from '../shared/utils';

/**
 * State for the custom script selector component
 */
interface CustomScriptSelectorState {
  isPopoverOpen: boolean;
}

export const CustomScriptSelector = memo<
  CommandArgumentValueSelectorProps<string, CustomScriptSelectorState>
>(({ value, valueText, onChange, store, command, requestFocus }) => {
  // Extract agentType from command.meta instead of direct parameter
  const agentType = command.commandDefinition.meta?.agentType as ResponseActionAgentType;

  return (
    <BaseArgumentSelector
      value={value}
      valueText={valueText}
      onChange={onChange}
      store={store}
      command={command}
      requestFocus={requestFocus}
      useDataHook={useGetCustomScripts}
      hookParams={agentType}
      transformToOptions={transformCustomScriptsToOptions}
      config={CUSTOM_SCRIPTS_CONFIG}
      useErrorToast={useGenericErrorToast}
    />
  );
});

CustomScriptSelector.displayName = 'CustomScriptSelector';
