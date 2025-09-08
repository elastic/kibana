/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { IHttpFetchError } from '@kbn/core/public';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { ActionListApiResponse } from '../../../../../common/endpoint/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetPendingActions } from '../../../hooks/response_actions/use_get_pending_actions';
import { BaseArgumentSelector } from '../shared/base_argument_selector';
import { PENDING_ACTIONS_CONFIG } from '../shared/constants';
import {
  useGenericErrorToast,
  transformPendingActionsToOptions,
  checkActionCancelPermission,
} from '../shared';
import { canCancelResponseAction } from '../../../../../common/endpoint/service/authz/cancel_authz_utils';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

/**
 * State for the pending actions selector component
 */
export interface PendingActionsSelectorState {
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
>(({ value, valueText, onChange, store, command, requestFocus, argName, argIndex }) => {
  // Extract agentType from command.meta instead of direct parameter
  const agentType = command.commandDefinition.meta?.agentType as ResponseActionAgentType;
  const endpointId = command.commandDefinition.meta?.endpointId;

  const userPrivileges = useUserPrivileges();
  const featureFlags = ExperimentalFeaturesService.get();
  const testId = useTestIdGenerator(`${command.commandDefinition.name}-${argName}-arg`);

  const privilegeChecker = useMemo(
    () => (actionCommand: string) => {
      // First check if the overall cancel feature is available
      const canCancelGeneral = canCancelResponseAction(
        userPrivileges.endpointPrivileges,
        featureFlags,
        agentType
      );

      if (!canCancelGeneral) {
        return {
          canCancel: false,
          reason: 'Cancel action is not available for this agent type or user.',
        };
      }

      // Then check specific command permission
      return checkActionCancelPermission(actionCommand, userPrivileges.endpointPrivileges);
    },
    [userPrivileges.endpointPrivileges, featureFlags, agentType]
  );

  const transformToOptionsWithPrivileges = useMemo(
    () => (response: ActionListApiResponse[], selectedValue?: string) =>
      transformPendingActionsToOptions(response, selectedValue, privilegeChecker),
    [privilegeChecker]
  );

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
      useDataHook={usePendingActionsDataHook}
      hookParams={{
        agentType,
        endpointId,
        page: 1,
        pageSize: 200,
      }}
      transformToOptions={transformToOptionsWithPrivileges}
      config={PENDING_ACTIONS_CONFIG}
      useErrorToast={usePendingActionsErrorToast}
      testIdPrefix={testId()}
    />
  );
});

PendingActionsSelector.displayName = 'PendingActionsSelector';
