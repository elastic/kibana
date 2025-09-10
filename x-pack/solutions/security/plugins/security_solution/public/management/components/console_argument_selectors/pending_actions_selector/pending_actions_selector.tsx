/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ResponseActionAgentType } from '../../../../../common/endpoint/service/response_actions/constants';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetPendingActions } from '../../../hooks/response_actions/use_get_pending_actions';
import { PENDING_ACTIONS_CONFIG, SHARED_TRUNCATION_STYLE } from '../shared/constants';
import { useGenericErrorToast, checkActionCancelPermission } from '../shared';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useKibana } from '../../../../common/lib/kibana';
import {
  useBaseSelectorState,
  useBaseSelectorHandlers,
  useRenderDelay,
  useFocusManagement,
  usePendingActionsOptions,
} from '../shared/hooks';
import { createSelectionHandler, createKeyDownHandler } from '../shared/utils';
import { ERROR_LOADING_PENDING_ACTIONS } from '../../../common/translations';

/**
 * State for the pending actions selector component
 */
export interface PendingActionsSelectorState {
  isPopoverOpen: boolean;
}

/**
 * A Console Argument Selector component that enables the user to select from available pending actions
 */
export const PendingActionsSelector = memo<
  CommandArgumentValueSelectorProps<
    string,
    PendingActionsSelectorState,
    { agentType?: ResponseActionAgentType; endpointId?: string }
  >
>(({ value, valueText, onChange, store, command, requestFocus, argName, argIndex }) => {
  const agentType = command.commandDefinition.meta?.agentType;
  const endpointId = command.commandDefinition.meta?.endpointId;

  const userPrivileges = useUserPrivileges();

  const { data, isLoading, error } = useGetPendingActions({
    agentType,
    endpointId,
    page: 1,
    pageSize: 200,
  });

  const privilegeChecker = useCallback(
    (actionCommand: string) => {
      return checkActionCancelPermission(actionCommand, userPrivileges.endpointPrivileges);
    },
    [userPrivileges.endpointPrivileges]
  );

  const options = usePendingActionsOptions({
    response: data ? [data] : null,
    selectedValue: value,
    privilegeChecker,
  });

  const {
    services: { notifications },
  } = useKibana();

  const testId = useTestIdGenerator(`${command.commandDefinition.name}-${argName}-arg-${argIndex}`);

  const state = useBaseSelectorState(store, value);
  const { handleOpenPopover, handleClosePopover } = useBaseSelectorHandlers(
    state,
    onChange,
    value || '',
    valueText || ''
  );

  const isAwaitingRenderDelay = useRenderDelay();

  useFocusManagement(state.isPopoverOpen, requestFocus);

  useGenericErrorToast(error, notifications, ERROR_LOADING_PENDING_ACTIONS);

  const handleSelection = useCallback(
    (newOptions: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      const handler = createSelectionHandler(onChange, state);
      handler(newOptions, _event, changedOption);
    },
    [onChange, state]
  );

  const renderOption = useCallback(
    (option: EuiSelectableOption) => {
      const hasDescription = 'description' in option && option.description;
      const hasToolTipContent = 'toolTipContent' in option && option.toolTipContent;
      const testIdPrefix = testId();
      const descriptionText = hasDescription ? String(option.description) : '';
      const toolTipText = hasToolTipContent ? String(option.toolTipContent) : '';

      const content = (
        <div data-test-subj={`${testIdPrefix}-script`}>
          <EuiText size="s" css={SHARED_TRUNCATION_STYLE}>
            <strong data-test-subj={`${option.label}-label`}>{option.label}</strong>
          </EuiText>
          {hasDescription ? (
            <EuiToolTip position="right" content={descriptionText}>
              <EuiText data-test-subj={`${option.label}-description`} color="subdued" size="s">
                <small css={SHARED_TRUNCATION_STYLE}>{descriptionText}</small>
              </EuiText>
            </EuiToolTip>
          ) : null}
        </div>
      );

      // If the option has toolTipContent (typically for disabled options), wrap in tooltip
      if (hasToolTipContent) {
        return (
          <EuiToolTip position="right" content={toolTipText}>
            {content}
          </EuiToolTip>
        );
      }

      return content;
    },
    [testId]
  );

  if (isAwaitingRenderDelay || (isLoading && !error)) {
    const testIdPrefix = testId();
    return <EuiLoadingSpinner data-test-subj={`${testIdPrefix}-loading`} size="m" />;
  }

  const testIdPrefix = testId();

  return (
    <EuiPopover
      isOpen={state.isPopoverOpen}
      offset={10}
      panelStyle={{
        padding: 0,
        minWidth: PENDING_ACTIONS_CONFIG.minWidth,
      }}
      data-test-subj={testIdPrefix}
      closePopover={handleClosePopover}
      panelProps={{ 'data-test-subj': `${testIdPrefix}-popoverPanel` }}
      button={
        <EuiToolTip content={PENDING_ACTIONS_CONFIG.tooltipText} position="top" display="block">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} onClick={handleOpenPopover}>
              <div title={valueText}>{valueText || PENDING_ACTIONS_CONFIG.initialLabel}</div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      }
    >
      {state.isPopoverOpen && (
        <EuiSelectable
          id={PENDING_ACTIONS_CONFIG.selectableId}
          searchable={true}
          options={options}
          onChange={handleSelection}
          renderOption={renderOption}
          singleSelection
          searchProps={{
            placeholder: valueText || PENDING_ACTIONS_CONFIG.initialLabel,
            autoFocus: true,
            onKeyDown: createKeyDownHandler,
          }}
          listProps={{
            rowHeight: PENDING_ACTIONS_CONFIG.rowHeight,
            showIcons: true,
            textWrap: 'truncate',
          }}
          errorMessage={
            error ? (
              <FormattedMessage
                id="xpack.securitySolution.baseArgumentSelector.errorLoading"
                defaultMessage="Error loading data"
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
