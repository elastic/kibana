/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError } from '@kbn/core/public';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetPendingActions } from '../../../hooks/response_actions/use_get_pending_actions';
import { BaseArgumentSelector } from '../shared/base_argument_selector';
import { PENDING_ACTIONS_CONFIG } from '../shared/constants';
import { useGenericErrorToast, transformPendingActionsToOptions } from '../shared';

/**
 * State for the pending actions selector component
 */
interface PendingActionsSelectorState {
  isPopoverOpen: boolean;
}

/**
 * Hook wrapper that properly handles the data transformation for BaseArgumentSelector
 */
const usePendingActionsDataHook = (params: unknown) => {
  const hookParams = params as {
    agentType: ResponseActionAgentType;
    endpointId?: string;
    page: number;
    pageSize: number;
  };

  const result = useGetPendingActions(hookParams);

  // Transform the single response object into array format expected by BaseArgumentSelector
  return {
    data: result.data ? [result.data] : [],
    isLoading: result.isLoading,
    error: result.error,
  };
};

/**
 * Custom error toast hook for pending actions
 */
const usePendingActionsErrorToast = (
  error: IHttpFetchError<unknown> | null,
  notifications: NotificationsStart
) => {
  useGenericErrorToast(error, notifications, 'Error loading pending actions');
};

export const PendingActionsSelector = memo<
  CommandArgumentValueSelectorProps<string, PendingActionsSelectorState>
>(({ value, valueText, onChange, store, command, requestFocus }) => {
  // Extract agentType from command.meta instead of direct parameter
  const agentType = command.commandDefinition.meta?.agentType as ResponseActionAgentType;
  const endpointId = command.commandDefinition.meta?.endpointId;

  return (
    <BaseArgumentSelector
      value={value}
      valueText={valueText}
      onChange={onChange}
      store={store}
      command={command}
      requestFocus={requestFocus}
      useDataHook={usePendingActionsDataHook}
      hookParams={{
        agentType,
        endpointId,
        page: 1,
        pageSize: 100,
      }}
      transformToOptions={transformPendingActionsToOptions}
      config={PENDING_ACTIONS_CONFIG}
      useErrorToast={usePendingActionsErrorToast}
    />
  );
});

PendingActionsSelector.displayName = 'PendingActionsSelector';
