/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetPendingActions } from '../../../hooks/response_actions/use_get_pending_actions';
import { useKibana } from '../../../../common/lib/kibana';
import { usePendingActionsErrorToast } from './use_pending_actions_error_toast';

// CSS to have a tooltip in place with a one line truncated description
const truncationStyle = css({
  display: '-webkit-box',
  overflow: 'hidden',
  WebkitBoxOrient: 'vertical',
  WebkitLineClamp: 1,
  lineClamp: 1, // standardized fallback for modern Firefox
  textOverflow: 'ellipsis',
  whiteSpace: 'normal',
});

const INITIAL_DISPLAY_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.pendingActionsSelector.initialDisplayLabel',
  { defaultMessage: 'Click to select action' }
);

const TOOLTIP_TEXT = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.pendingActionsSelector.tooltipText',
  { defaultMessage: 'Click to choose pending action to cancel' }
);

/**
 * State for the pending actions selector component
 */
interface PendingActionsSelectorState {
  isPopoverOpen: boolean;
}

interface PendingActionItem {
  id: string;
  command: string;
  createdBy: string;
  '@timestamp': string;
  agents: Array<{
    agent: { id: string };
    host: { name: string };
  }>;
  comment?: string;
  // refactor - can't be edr specific
  parameters: {
    scriptName?: string;
  };
}

type SelectableOption = EuiSelectableOption<
  Partial<{ description: string; actionItem: PendingActionItem }>
>;

export const PendingActionsSelector = memo<
  CommandArgumentValueSelectorProps<string, PendingActionsSelectorState>
>(({ value, valueText, onChange, store: _store, command, requestFocus }) => {
  // Extract agentType from command.meta instead of direct parameter
  const agentType = command.commandDefinition.meta?.agentType as ResponseActionAgentType;
  const endpointId = command.commandDefinition.meta?.endpointId;

  const {
    services: { notifications },
  } = useKibana();

  const state = useMemo<PendingActionsSelectorState>(() => {
    return _store ?? { isPopoverOpen: !value };
  }, [_store, value]);
  const setIsPopoverOpen = useCallback(
    (newValue: boolean) => {
      onChange({
        value,
        valueText,
        store: {
          ...state,
          isPopoverOpen: newValue,
        },
      });
    },
    [onChange, state, value, valueText]
  );

  const {
    data: actionsResponse,
    isLoading: isLoadingActions,
    error: actionsError,
  } = useGetPendingActions({
    agentType,
    endpointId,
    page: 1,
    pageSize: 100,
  });

  const actionsOptions: SelectableOption[] = useMemo(() => {
    if (!actionsResponse?.data) {
      return [];
    }
    return actionsResponse.data.map((action: PendingActionItem) => {
      const isChecked = action.id === value;
      const hostName = action.agents?.[0]?.host?.name || 'Unknown host';
      const timestamp = new Date(action['@timestamp']).toLocaleString();
      const description = `${action.command} - ${action.parameters.scriptName} on ${hostName} by ${action.createdBy} at ${timestamp}`;

      return {
        label: action.id,
        description,
        actionItem: action,
        checked: isChecked ? 'on' : undefined,
      };
    });
  }, [actionsResponse?.data, value]);

  // There is a race condition between the parent input and search input which results in search having the last char of the argument eg. 'e' from '--actionId'
  // This is a workaround to ensure the popover is not shown until the input is focused
  const [isAwaitingRenderDelay, setIsAwaitingRenderDelay] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAwaitingRenderDelay(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const renderOption = (option: SelectableOption) => {
    return (
      <>
        <EuiText size="s" css={truncationStyle}>
          <strong data-test-subj={`${option.label}-label`}>{option.label}</strong>
        </EuiText>
        {option?.description && (
          <EuiToolTip position="right" content={option.description}>
            <EuiText data-test-subj={`${option.label}-description`} color="subdued" size="s">
              <small css={truncationStyle}>{option.description}</small>
            </EuiText>
          </EuiToolTip>
        )}
      </>
    );
  };

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, [setIsPopoverOpen]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  // Focus on the console's input element when the popover closes
  useEffect(() => {
    if (!state.isPopoverOpen && requestFocus) {
      // Use setTimeout to ensure focus happens after the popover closes
      setTimeout(() => {
        requestFocus();
      }, 0);
    }
  }, [state.isPopoverOpen, requestFocus]);

  const handleActionSelection = useCallback(
    (newOptions: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      if (changedOption.checked === 'on') {
        onChange({
          value: changedOption.label,
          valueText: changedOption.label,
          store: {
            ...state,
            isPopoverOpen: false,
          },
        });
      } else {
        onChange({
          value: '',
          valueText: '',
          store: {
            ...state,
            isPopoverOpen: false,
          },
        });
      }
    },
    [onChange, state]
  );

  // Show error toast for pending actions errors
  usePendingActionsErrorToast(actionsError, notifications);

  if (isAwaitingRenderDelay || (isLoadingActions && !actionsError)) {
    return <EuiLoadingSpinner />;
  }

  return (
    <EuiPopover
      isOpen={state.isPopoverOpen}
      offset={10}
      panelStyle={{
        padding: 0,
        minWidth: 500,
      }}
      closePopover={handleClosePopover}
      button={
        <EuiToolTip content={TOOLTIP_TEXT} position="top" display="block">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} onClick={handleOpenPopover}>
              <div title={valueText}>{valueText || INITIAL_DISPLAY_LABEL}</div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      }
    >
      {state.isPopoverOpen && (
        <EuiSelectable
          id="pending-actions-combobox"
          searchable={true}
          options={actionsOptions}
          onChange={handleActionSelection}
          renderOption={renderOption}
          singleSelection
          searchProps={{
            placeholder: valueText || INITIAL_DISPLAY_LABEL,
            autoFocus: true,
            onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
              // Only stop propagation for typing keys, not for navigation keys - otherwise input lose focus
              if (!['Enter', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) {
                event.stopPropagation();
              }
            },
          }}
          listProps={{
            rowHeight: 70,
            showIcons: true,
            textWrap: 'truncate',
          }}
          errorMessage={
            actionsError ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.pendingActionsSelector.errorLoading"
                defaultMessage="Error loading pending actions"
              />
            ) : undefined
          }
        >
          {(list, search) => (
            <>
              <div css={{ margin: 5 }}>{search}</div>
              {list}
            </>
          )}
        </EuiSelectable>
      )}
    </EuiPopover>
  );
});

PendingActionsSelector.displayName = 'PendingActionsSelector';
