/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
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
import type { CustomScriptsRequestQueryParams } from '../../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { ResponseActionScript } from '../../../../../common/endpoint/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetCustomScripts } from '../../../hooks/custom_scripts/use_get_custom_scripts';
import { CUSTOM_SCRIPTS_CONFIG, SHARED_TRUNCATION_STYLE } from '../shared/constants';
import { useGenericErrorToast, transformCustomScriptsToOptions } from '../shared';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useKibana } from '../../../../common/lib/kibana';
import {
  useBaseSelectorState,
  useBaseSelectorHandlers,
  useRenderDelay,
  useFocusManagement,
} from '../shared/hooks';
import { createSelectionHandler, createKeyDownHandler } from '../shared/utils';
import { ERROR_LOADING_CUSTOM_SCRIPTS } from '../../../common/translations';

/**
 * State for the custom script selector component
 */
export interface CustomScriptSelectorState<TScriptRecordMeta extends {} = {}> {
  isPopoverOpen: boolean;
  selectedOption: ResponseActionScript<TScriptRecordMeta> | undefined;
}

/**
 * A Console Argument Selector component that enables the user to select from available custom scripts
 */
export const CustomScriptSelector = memo<
  CommandArgumentValueSelectorProps<
    string,
    CustomScriptSelectorState,
    EndpointCommandDefinitionMeta
  >
>(({ value, valueText, onChange, store, command, requestFocus, argIndex }) => {
  const { agentType, platform } = command.commandDefinition.meta ?? {};

  const scriptsApiQueryParams: Omit<CustomScriptsRequestQueryParams, 'agentType'> = useMemo(() => {
    if (agentType === 'sentinel_one' && platform) {
      return { osType: platform };
    }
    return {};
  }, [agentType, platform]);

  const {
    data: scripts = [],
    isLoading,
    error,
  } = useGetCustomScripts(agentType, scriptsApiQueryParams);

  const options = useMemo(() => {
    return transformCustomScriptsToOptions(scripts, value);
  }, [scripts, value]);

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

  const {
    services: { notifications },
  } = useKibana();

  const testId = useTestIdGenerator(`scriptSelector-${command.commandDefinition.name}-${argIndex}`);

  const state = useBaseSelectorState(store, value);
  const { handleOpenPopover, handleClosePopover } = useBaseSelectorHandlers(
    state,
    onChange,
    value || '',
    valueText || ''
  );

  const isAwaitingRenderDelay = useRenderDelay();

  useFocusManagement(state.isPopoverOpen, requestFocus);

  useGenericErrorToast(error, notifications, ERROR_LOADING_CUSTOM_SCRIPTS);

  const handleSelection = useCallback(
    (newOptions: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      const handler = createSelectionHandler(onChange, state, handleSentinelOneSelectionChange);
      handler(newOptions, _event, changedOption);
    },
    [onChange, state, handleSentinelOneSelectionChange]
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
        minWidth: CUSTOM_SCRIPTS_CONFIG.minWidth,
      }}
      data-test-subj={testIdPrefix}
      closePopover={handleClosePopover}
      panelProps={{ 'data-test-subj': `${testIdPrefix}-popoverPanel` }}
      button={
        <EuiToolTip content={CUSTOM_SCRIPTS_CONFIG.tooltipText} position="top" display="block">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} onClick={handleOpenPopover}>
              <div title={valueText}>{valueText || CUSTOM_SCRIPTS_CONFIG.initialLabel}</div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      }
    >
      {state.isPopoverOpen && (
        <EuiSelectable
          id={CUSTOM_SCRIPTS_CONFIG.selectableId}
          searchable={true}
          options={options}
          onChange={handleSelection}
          renderOption={renderOption}
          singleSelection
          searchProps={{
            placeholder: valueText || CUSTOM_SCRIPTS_CONFIG.initialLabel,
            autoFocus: true,
            onKeyDown: createKeyDownHandler,
          }}
          listProps={{
            rowHeight: CUSTOM_SCRIPTS_CONFIG.rowHeight,
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

CustomScriptSelector.displayName = 'CustomScriptSelector';
