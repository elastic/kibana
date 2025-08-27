/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiPopover,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiToolTip,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { useKibana } from '../../../../common/lib/kibana';
import type { BaseArgumentSelectorProps, BaseSelectorState } from './types';
import { SHARED_TRUNCATION_STYLE } from './constants';
import {
  useBaseSelectorState,
  useBaseSelectorHandlers,
  useRenderDelay,
  useFocusManagement,
} from './hooks';
import { createSelectionHandler, createKeyDownHandler } from './utils';

/**
 * Base component for text argument selectors
 */
const BaseArgumentSelectorComponent = <
  TData,
  TOption,
  TState extends BaseSelectorState = BaseSelectorState
>({
  value,
  valueText,
  onChange,
  store,
  requestFocus,
  useDataHook,
  hookParams,
  transformToOptions,
  config,
  useErrorToast,
  testIdPrefix,
  onSelectionChange,
}: BaseArgumentSelectorProps<TData, TOption, TState>) => {
  const {
    services: { notifications },
  } = useKibana();

  const state = useBaseSelectorState(store, value);
  const { handleOpenPopover, handleClosePopover } = useBaseSelectorHandlers(
    state,
    onChange,
    value || '',
    valueText || ''
  );

  const { data = [], isLoading, error } = useDataHook(hookParams);

  const options: EuiSelectableOption<TOption>[] = useMemo(() => {
    // Ensure data is always passed as an array to transformToOptions
    const dataArray = Array.isArray(data) ? data : [data];
    return transformToOptions(dataArray, value);
  }, [data, value, transformToOptions]);

  const isAwaitingRenderDelay = useRenderDelay();

  useFocusManagement(state.isPopoverOpen, requestFocus);

  useErrorToast(error, notifications);

  const handleSelection = useCallback(
    (newOptions: EuiSelectableOption[], _event: unknown, changedOption: EuiSelectableOption) => {
      const handler = createSelectionHandler(onChange, state, onSelectionChange);
      handler(newOptions, _event, changedOption);
    },
    [onChange, state, onSelectionChange]
  );

  const renderOption = useCallback(
    (option: EuiSelectableOption<TOption>) => {
      const hasDescription = 'description' in option && option.description;
      const testId = testIdPrefix ? `${testIdPrefix}-` : '';
      const descriptionText = hasDescription ? String(option.description) : '';

      return (
        <div data-test-subj={`${testId}script`}>
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
    },
    [testIdPrefix]
  );

  if (isAwaitingRenderDelay || (isLoading && !error)) {
    const testId = testIdPrefix ? `${testIdPrefix}-` : '';
    return <EuiLoadingSpinner data-test-subj={`${testId}loading`} size="m" />;
  }

  const testId = testIdPrefix ? `${testIdPrefix}-` : '';

  return (
    <EuiPopover
      isOpen={state.isPopoverOpen}
      offset={10}
      panelStyle={{
        padding: 0,
        minWidth: config.minWidth,
      }}
      data-test-subj={testId.slice(0, -1)}
      closePopover={handleClosePopover}
      panelProps={{ 'data-test-subj': `${testId}popoverPanel` }}
      button={
        <EuiToolTip content={config.tooltipText} position="top" display="block">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} onClick={handleOpenPopover}>
              <div title={valueText}>{valueText || config.initialLabel}</div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      }
    >
      {state.isPopoverOpen && (
        <EuiSelectable
          id={config.selectableId}
          searchable={true}
          options={options}
          onChange={handleSelection}
          renderOption={renderOption}
          singleSelection
          searchProps={{
            placeholder: valueText || config.initialLabel,
            autoFocus: true,
            onKeyDown: createKeyDownHandler,
          }}
          listProps={{
            rowHeight: config.rowHeight,
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
};

export const BaseArgumentSelector = memo(
  BaseArgumentSelectorComponent
) as typeof BaseArgumentSelectorComponent;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(BaseArgumentSelector as any).displayName = 'BaseArgumentSelector';
