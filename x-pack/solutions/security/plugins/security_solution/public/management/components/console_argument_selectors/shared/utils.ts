/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { ActionDetails, ResponseActionScript } from '../../../../../common/endpoint/types';
import type { EndpointAuthz } from '../../../../../common/endpoint/types/authz';
import type { BaseSelectorState } from './types';
import type { ResponseActionsApiCommandNames } from '../../../../../common/endpoint/service/response_actions/constants';
import { RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP } from '../../../../../common/endpoint/service/response_actions/constants';
import { canUserCancelCommand } from '../../../../../common/endpoint/service/authz/cancel_authz_utils';
import {
  getCancelPermissionDeniedMessage,
  getPermissionVerificationErrorMessage,
} from '../../../common/translations';

/**
 * Type representing a pending action item for cancellation
 */
export type PendingActionItem = ActionDetails;

/**
 * Generic handler for option selection in selectable components
 */
export const createSelectionHandler = <T extends BaseSelectorState>(
  onChange: (newData: { value: string; valueText: string; store: T }) => void,
  state: T
) => {
  return (
    _newOptions: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => {
    if (changedOption.checked === 'on' && 'value' in changedOption) {
      const newState = {
        ...state,
        isPopoverOpen: false,
        selectedOption: changedOption.data,
      };
      onChange({
        value: String(changedOption.value || ''),
        valueText: String(changedOption.value || ''),
        store: newState,
      });
    } else {
      const newState = {
        ...state,
        isPopoverOpen: false,
        selectedOption: undefined,
      };
      onChange({
        value: '',
        valueText: '',
        store: newState,
      });
    }
  };
};

/**
 * Generic keyboard event handler for search input
 */
export const createKeyDownHandler = (event: React.KeyboardEvent<HTMLInputElement>) => {
  // Only stop propagation for typing keys, not for navigation keys - otherwise input lose focus
  if (!['Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) {
    event.stopPropagation();
  }
};

/**
 * Transform custom scripts data to selectable options
 */
export const transformCustomScriptsToOptions = (
  data: ResponseActionScript[],
  selectedValue?: string
): EuiSelectableOption<Partial<{ description: ResponseActionScript['description'] }>>[] => {
  return data.map((script: ResponseActionScript) => {
    const isChecked = script.name === selectedValue;
    return {
      label: script.name,
      value: script.name,
      description: script.description,
      checked: isChecked ? 'on' : undefined,
      data: script,
    };
  });
};

/**
 * Check if user has permission to cancel a specific action
 */
export const checkActionCancelPermission = (
  command: string,
  endpointPrivileges: EndpointAuthz
): { canCancel: boolean; reason?: string } => {
  const displayCommand =
    RESPONSE_ACTION_API_COMMAND_TO_CONSOLE_COMMAND_MAP[command as ResponseActionsApiCommandNames] ||
    command;

  try {
    const canCancel = canUserCancelCommand(
      endpointPrivileges,
      command as ResponseActionsApiCommandNames
    );

    if (!canCancel) {
      return {
        canCancel: false,
        reason: getCancelPermissionDeniedMessage(displayCommand),
      };
    }

    return { canCancel: true };
  } catch (error) {
    return {
      canCancel: false,
      reason: getPermissionVerificationErrorMessage(displayCommand),
    };
  }
};
