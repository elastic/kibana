/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type {
  ActionListApiResponse,
  ActionDetails,
  ResponseActionScript,
} from '../../../../../common/endpoint/types';
import type { BaseSelectorState } from './types';

/**
 * Type representing a pending action item for cancellation
 */
export type PendingActionItem = ActionDetails;

/**
 * Generic handler for option selection in selectable components
 */
export const createSelectionHandler = <T extends BaseSelectorState>(
  onChange: Function,
  state: T,
  onSelectionChange?: (option: EuiSelectableOption | undefined, state: T) => void
) => {
  return (
    _newOptions: EuiSelectableOption[],
    _event: unknown,
    changedOption: EuiSelectableOption
  ) => {
    if (changedOption.checked === 'on') {
      const newState = {
        ...state,
        isPopoverOpen: false,
        selectedOption: changedOption.data,
      };
      onChange({
        value: changedOption.value,
        valueText: changedOption.value,
        store: newState,
      });
      onSelectionChange?.(changedOption, newState);
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
      onSelectionChange?.(undefined, newState);
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
 * Transform pending actions response (using standard ActionListApiResponse) to selectable options.
 * Labels are formatted as "CommandName - ActionId" for better user context, while values remain as action IDs
 * for compatibility with existing cancel action workflows.
 */
export const transformPendingActionsToOptions = (
  response: ActionListApiResponse[],
  selectedValue?: string
): EuiSelectableOption<Partial<{ description: string; actionItem: ActionDetails }>>[] => {
  // The hook returns a single response object, but our data parameter is an array
  // So we need to handle both cases
  if (!response || response.length === 0) {
    return [];
  }

  // Extract the actual response object from the array
  const actualResponse = response[0];

  if (!actualResponse || !actualResponse.data) {
    return [];
  }

  const data = actualResponse.data;

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((action: ActionDetails) => {
    const isChecked = action.id === selectedValue;
    const hostName = action.agents?.[0] ? action.hosts?.[action.agents[0]]?.name : undefined;
    const timestamp = new Date(action.startedAt).toLocaleString();
    const command = action.command;
    const createdBy = action.createdBy;
    const description = `${command} on ${
      hostName || 'Unknown host'
    } by ${createdBy} at ${timestamp}`;

    return {
      label: `${action.command} - ${action.id}`,
      value: action.id,
      description,
      actionItem: action,
      checked: isChecked ? 'on' : undefined,
    };
  });
};
