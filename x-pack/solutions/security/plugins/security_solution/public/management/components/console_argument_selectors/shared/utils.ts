/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { CustomScript } from '../../../../../server/endpoint/services';
import type { PendingActionsResponse } from '../../../hooks/response_actions/use_get_pending_actions';
import type { BaseSelectorState } from './types';

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
        value: changedOption.label,
        valueText: changedOption.label,
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
  data: CustomScript[],
  selectedValue?: string
): EuiSelectableOption<Partial<{ description: CustomScript['description'] }>>[] => {
  return data.map((script: CustomScript) => {
    const isChecked = script.name === selectedValue;
    return {
      label: script.name,
      description: script.description,
      checked: isChecked ? 'on' : undefined,
      data: script,
    };
  });
};

/**
 * Type for individual pending action item (extracted from hook's response type)
 */
export type PendingActionItem = PendingActionsResponse['data'][0];

/**
 * Transform pending actions response to selectable options
 */
export const transformPendingActionsToOptions = (
  response: PendingActionsResponse[],
  selectedValue?: string
): EuiSelectableOption<Partial<{ description: string; actionItem: PendingActionItem }>>[] => {
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

  return (data as PendingActionItem[]).map((action: PendingActionItem) => {
    const isChecked = action.id === selectedValue;
    const hostName = action.agents?.[0]?.host?.name;
    const timestamp = new Date(action['@timestamp']).toLocaleString();
    const command = action.command;
    const createdBy = action.createdBy;
    const description = `${command} on ${hostName} by ${createdBy} at ${timestamp}`;

    return {
      label: action.id,
      description,
      actionItem: action,
      checked: isChecked ? 'on' : undefined,
    };
  });
};
