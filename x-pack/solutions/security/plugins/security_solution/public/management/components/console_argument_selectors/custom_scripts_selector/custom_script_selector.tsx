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
  EuiIcon,
  EuiSpacer,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CustomScriptsRequestQueryParams } from '../../../../../common/api/endpoint/custom_scripts/get_custom_scripts_route';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import type { ResponseActionScript } from '../../../../../common/endpoint/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import { useGetCustomScripts } from '../../../hooks/custom_scripts/use_get_custom_scripts';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useKibana } from '../../../../common/lib/kibana';
import {
  useBaseSelectorState,
  useBaseSelectorHandlers,
  useRenderDelay,
  useFocusManagement,
} from '../shared/hooks';

import { CUSTOM_SCRIPTS_CONFIG, SHARED_TRUNCATION_STYLE } from '../shared/constants';
import { useGenericErrorToast, transformCustomScriptsToOptions } from '../shared';
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
>(({ value, valueText, argName, argIndex, onChange, store: _store, command, requestFocus }) => {
  const testId = useTestIdGenerator(`scriptSelector-${command.commandDefinition.name}-${argIndex}`);
  const { agentType, platform } = command.commandDefinition.meta ?? {};

  const scriptsApiQueryParams: Omit<CustomScriptsRequestQueryParams, 'agentType'> = useMemo(() => {
    if (platform && (agentType === 'sentinel_one' || agentType === 'endpoint')) {
      return { osType: platform };
    }

    return {};
  }, [agentType, platform]);

  // Because the console supports multiple instances of the same argument, we need to ensure that
  // if the command was defined to now allow multiples, that we only render the first one.
  const shouldRender = useMemo<boolean>(() => {
    const argDefinition = command.commandDefinition.args?.[argName];
    return argDefinition?.allowMultiples || argIndex === 0;
  }, [argIndex, argName, command.commandDefinition.args]);

  const {
    data = [],
    isLoading: isLoadingScripts,
    error: scriptsError,
  } = useGetCustomScripts(agentType, scriptsApiQueryParams, { enabled: shouldRender });

  const scriptsOptions = useMemo(() => {
    return transformCustomScriptsToOptions(data, value);
  }, [data, value]);

  const state = useBaseSelectorState(_store, value);

  useEffect(() => {
    // If the argument selector should not be rendered, then at least set the `value` to a string
    // so that the normal command, and argument validations can be invoked if the user still ENTERs the command
    if (!shouldRender && value !== '') {
      onChange({
        value: '',
        valueText: '',
        store: state,
      });
    } else if (
      // For SentinelOne: If a `value` is set, but we have no `selectedOption`, then the component
      // might be getting initialized from either console input history or from a user's past action.
      // Ensure that we set `selectedOption` once we get the list of scripts
      shouldRender &&
      (agentType === 'sentinel_one' || agentType === 'endpoint') &&
      value &&
      !state?.selectedOption &&
      data.length > 0
    ) {
      const preSelectedScript = data.find((script) => script.name === value);

      // If script not found, then reset value/valueText
      if (!preSelectedScript) {
        onChange({
          value: '',
          valueText: '',
          store: state,
        });
      } else {
        onChange({
          value,
          valueText,
          store: {
            ...state,
            selectedOption: preSelectedScript,
          },
        });
      }
    }
  }, [agentType, data, onChange, shouldRender, state, value, valueText]);

  const {
    services: { notifications },
  } = useKibana();

  const { handleOpenPopover, handleClosePopover } = useBaseSelectorHandlers(
    state,
    onChange,
    value || '',
    valueText || ''
  );

  const isAwaitingRenderDelay = useRenderDelay();

  useFocusManagement(state.isPopoverOpen, requestFocus);

  useGenericErrorToast(scriptsError, notifications, ERROR_LOADING_CUSTOM_SCRIPTS);

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
      const descriptionText = hasDescription ? String(option.description) : '';
      const toolTipText = hasToolTipContent ? String(option.toolTipContent) : '';

      const content = (
        <div data-test-subj={testId('script')}>
          <EuiText size="s" css={SHARED_TRUNCATION_STYLE}>
            <strong data-test-subj={`${option.label}-label`}>{option.label}</strong>
          </EuiText>
          {hasDescription ? (
            <EuiToolTip position="right" content={descriptionText}>
              <EuiText
                data-test-subj={`${option.label}-description`}
                color="subdued"
                size="s"
                tabIndex={0}
              >
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

  if (isAwaitingRenderDelay || (isLoadingScripts && !scriptsError)) {
    return <EuiLoadingSpinner data-test-subj={testId('loading')} size="m" />;
  }

  return shouldRender ? (
    <EuiPopover
      isOpen={state.isPopoverOpen}
      offset={10}
      panelStyle={{
        minWidth: CUSTOM_SCRIPTS_CONFIG.minWidth,
      }}
      data-test-subj={testId()}
      closePopover={handleClosePopover}
      panelProps={{ 'data-test-subj': testId('popoverPanel') }}
      panelPaddingSize="s"
      button={
        <EuiToolTip content={CUSTOM_SCRIPTS_CONFIG.tooltipText} position="top" display="block">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none" tabIndex={0}>
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
          options={scriptsOptions}
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
            bordered: true,
          }}
          errorMessage={
            scriptsError ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.customScriptSelector.errorLoading"
                defaultMessage="Error loading scripts"
              />
            ) : undefined
          }
        >
          {(list, search) => (
            <>
              {search}
              <EuiSpacer size="s" />
              {list}
            </>
          )}
        </EuiSelectable>
      )}
    </EuiPopover>
  ) : (
    <EuiText size="s" color="subdued" data-test-subj={testId('noMultipleArgs')}>
      <EuiIcon type="warning" size="s" color="subdued" />{' '}
      <FormattedMessage
        id="xpack.securitySolution.endpoint.customScriptSelector.noMultipleArgs"
        defaultMessage="Argument is only supported once per command"
      />
    </EuiText>
  );
});

CustomScriptSelector.displayName = 'CustomScriptSelector';
