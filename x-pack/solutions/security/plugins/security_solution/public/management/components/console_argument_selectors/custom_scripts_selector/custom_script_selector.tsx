/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError } from '@kbn/core/public';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { CustomScriptsRequestQueryParams } from '../../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { ResponseActionScript } from '../../../../../common/endpoint/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetCustomScripts } from '../../../hooks/custom_scripts/use_get_custom_scripts';
import { BaseArgumentSelector } from '../shared/base_argument_selector';
import { CUSTOM_SCRIPTS_CONFIG } from '../shared/constants';
import { useGenericErrorToast, transformCustomScriptsToOptions } from '../shared';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

/**
 * State for the custom script selector component
 */
export interface CustomScriptSelectorState<TScriptRecordMeta extends {} = {}> {
  isPopoverOpen: boolean;
  selectedOption: ResponseActionScript<TScriptRecordMeta> | undefined;
}

/**
 * Hook wrapper that properly handles the data transformation for BaseArgumentSelector
 */
const useCustomScriptsDataHook = (params: unknown) => {
  const hookParams = params as {
    agentType: ResponseActionAgentType;
    scriptsApiQueryParams: Omit<CustomScriptsRequestQueryParams, 'agentType'>;
  };

  const result = useGetCustomScripts(hookParams.agentType, hookParams.scriptsApiQueryParams);

  return {
    data: result.data || [],
    isLoading: result.isLoading,
    error: result.error,
  };
};

/**
 * Custom error toast hook for custom scripts
 */
const useCustomScriptsErrorToast = (
  error: IHttpFetchError<unknown> | null,
  notifications: NotificationsStart
) => {
  useGenericErrorToast(error, notifications, 'Error loading custom scripts');
};

export const CustomScriptSelector = memo<
  CommandArgumentValueSelectorProps<
    string,
    CustomScriptSelectorState,
    EndpointCommandDefinitionMeta
  >
>(({ value, valueText, onChange, store, command, requestFocus, argName, argIndex }) => {
  const testId = useTestIdGenerator(`scriptSelector-${command.commandDefinition.name}`);
  const { agentType, platform } = command.commandDefinition.meta ?? {};

  const scriptsApiQueryParams: Omit<CustomScriptsRequestQueryParams, 'agentType'> = useMemo(() => {
    if (agentType === 'sentinel_one' && platform) {
      return { osType: platform };
    }

    return {};
  }, [agentType, platform]);

  // SentinelOne selection change handler for pre-selection logic
  const handleSentinelOneSelectionChange = useCallback(
    (selectedOption: unknown, newState: CustomScriptSelectorState) => {
      // Handle pre-selection logic for SentinelOne when component is initialized from history
      if (agentType === 'sentinel_one' && value && !store?.selectedOption) {
        const script = selectedOption as ResponseActionScript;
        if (script && script.name !== value) {
          // Script not found, reset value
          onChange({
            value: '',
            valueText: '',
            store: newState,
          });
        }
      }
    },
    [agentType, value, store?.selectedOption, onChange]
  );

  // Handle SentinelOne pre-selection from history
  const { data: scripts = [] } = useGetCustomScripts(agentType, scriptsApiQueryParams);

  useEffect(() => {
    // For SentinelOne: If a `value` is set, but we have no `selectedOption`, then component
    // might be getting initialized from either console input history or from a user's past action.
    // Ensure that we set `selectedOption` once we get the list of scripts
    if (agentType === 'sentinel_one' && value && !store?.selectedOption && scripts.length > 0) {
      const preSelectedScript = scripts.find((script) => script.name === value);

      // If script not found, then reset value/valueText
      if (!preSelectedScript) {
        onChange({
          value: '',
          valueText: '',
          store: store || { isPopoverOpen: !value },
        });
      } else {
        onChange({
          value,
          valueText,
          store: {
            ...(store || { isPopoverOpen: !value }),
            selectedOption: preSelectedScript,
          },
        });
      }
    }
  }, [agentType, scripts, onChange, store, value, valueText]);

  return (
    <BaseArgumentSelector
      value={value}
      valueText={valueText}
      onChange={onChange}
      store={store}
      command={command}
      requestFocus={requestFocus}
      argName={argName}
      argIndex={argIndex}
      useDataHook={useCustomScriptsDataHook}
      hookParams={{
        agentType,
        scriptsApiQueryParams,
      }}
      transformToOptions={transformCustomScriptsToOptions}
      config={CUSTOM_SCRIPTS_CONFIG}
      useErrorToast={useCustomScriptsErrorToast}
      testIdPrefix={testId()}
      onSelectionChange={handleSentinelOneSelectionChange}
    />
  );
});

CustomScriptSelector.displayName = 'CustomScriptSelector';
