/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  ExportProviderSummary,
  ExportProviderType,
} from '../../../../../common/endpoint/types';
import type { CommandArgumentValueSelectorProps } from '../../console/types';
import type { EndpointCommandDefinitionMeta } from '../../endpoint_responder/types';
import { useGetExportProviders } from '../../../hooks/response_actions/use_get_export_providers';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';
import { useKibana } from '../../../../common/lib/kibana';
import type { BaseSelectorConfig } from '../shared';
import {
  SHARED_TRUNCATION_STYLE,
  createKeyDownHandler,
  createSelectionHandler,
  useBaseSelectorHandlers,
  useBaseSelectorState,
  useFocusManagement,
  useGenericErrorToast,
  useRenderDelay,
} from '../shared';

/**
 * State for the export provider selector component
 */
export interface ExportProviderSelectorState {
  isPopoverOpen: boolean;
  selectedOption: ExportProviderSummary | undefined;
}

const EXPORT_PROVIDERS_CONFIG: BaseSelectorConfig = {
  initialLabel: i18n.translate(
    'xpack.securitySolution.endpoint.exportProviderSelector.initialDisplayLabel',
    { defaultMessage: 'Click to select storage provider' }
  ),
  tooltipText: i18n.translate(
    'xpack.securitySolution.endpoint.exportProviderSelector.selectTooltip',
    {
      defaultMessage: 'Click to choose a storage provider',
    }
  ),
  minWidth: 400,
  rowHeight: 60,
  selectableId: 'export-providers-combobox',
};

const EXPORT_PROVIDER_TYPE_LABELS: Readonly<Record<ExportProviderType, string>> = {
  azure_blob: i18n.translate(
    'xpack.securitySolution.endpoint.exportProviderSelector.azureBlobTypeLabel',
    { defaultMessage: 'Azure Blob Storage' }
  ),
};

const ERROR_LOADING_EXPORT_PROVIDERS = i18n.translate(
  'xpack.securitySolution.endpoint.exportProviderSelector.errorLoadingToastTitle',
  { defaultMessage: 'Error loading storage providers' }
);

/**
 * A Console Argument Selector component that enables the user to select one of the export (storage)
 * providers defined in the host's Elastic Defend policy
 */
export const ExportProviderSelector = memo<
  CommandArgumentValueSelectorProps<
    string,
    ExportProviderSelectorState,
    EndpointCommandDefinitionMeta
  >
>(({ value, valueText, argName, argIndex, onChange, store: _store, command, requestFocus }) => {
  const testId = useTestIdGenerator(
    `exportProviderSelector-${command.commandDefinition.name}-${argIndex}`
  );
  const endpointId = command.commandDefinition.meta?.endpointId ?? '';

  // Because the console supports multiple instances of the same argument, we need to ensure that
  // if the command was defined to not allow multiples, that we only render the first one.
  const shouldRender = useMemo<boolean>(() => {
    const argDefinition = command.commandDefinition.args?.[argName];
    return argDefinition?.allowMultiples || argIndex === 0;
  }, [argIndex, argName, command.commandDefinition.args]);

  const {
    data = [],
    isFetched,
    isFetching,
    isLoading,
    error,
  } = useGetExportProviders(endpointId, { enabled: shouldRender && endpointId !== '' });

  const options = useMemo<EuiSelectableOption[]>(
    () =>
      data.map((provider) => ({
        label: provider.id,
        value: provider.id,
        description: i18n.translate(
          'xpack.securitySolution.endpoint.exportProviderSelector.providerDescription',
          {
            defaultMessage: '{typeLabel} · {accountName} / {container}',
            values: {
              typeLabel: EXPORT_PROVIDER_TYPE_LABELS[provider.type],
              accountName: provider.account_name,
              container: provider.container,
            },
          }
        ),
        checked: provider.id === value ? 'on' : undefined,
        data: provider,
      })),
    [data, value]
  );

  const state = useBaseSelectorState(_store, value);

  useEffect(() => {
    // If the argument selector should not be rendered, then at least set the `value` to a string
    // so that the normal command, and argument validations can be invoked if the user still ENTERs the command
    if (!shouldRender && value !== '') {
      onChange({ value: '', valueText: '', store: state });
      return;
    }

    // The value can come from the console input history, a pasted command (`--export=<id>`) or an
    // earlier selection. Keep it only while the host's policy has that provider. Check it only once
    // a fetch has settled: while one runs, `data` may be an older cached list.
    if (shouldRender && value && isFetched && !isFetching && !error) {
      const provider = data.find(({ id }) => id === value);

      if (!provider) {
        onChange({ value: '', valueText: '', store: { ...state, selectedOption: undefined } });
      } else if (!state.selectedOption) {
        onChange({ value, valueText, store: { ...state, selectedOption: provider } });
      }
    }
  }, [data, error, isFetched, isFetching, onChange, shouldRender, state, value, valueText]);

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

  useGenericErrorToast(error, notifications, ERROR_LOADING_EXPORT_PROVIDERS);

  const handleSelection = useMemo(() => createSelectionHandler(onChange, state), [onChange, state]);

  const renderOption = useCallback(
    (option: EuiSelectableOption) => {
      const descriptionText =
        'description' in option && option.description ? String(option.description) : '';

      return (
        <div data-test-subj={testId('provider')}>
          <EuiText size="s" css={SHARED_TRUNCATION_STYLE}>
            <strong data-test-subj={`${option.label}-label`}>{option.label}</strong>
          </EuiText>
          {descriptionText ? (
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
    },
    [testId]
  );

  if (isAwaitingRenderDelay || (shouldRender && isLoading && !error)) {
    return <EuiLoadingSpinner data-test-subj={testId('loading')} size="m" />;
  }

  return shouldRender ? (
    <EuiPopover
      isOpen={state.isPopoverOpen}
      offset={10}
      panelStyle={{
        minWidth: EXPORT_PROVIDERS_CONFIG.minWidth,
      }}
      data-test-subj={testId()}
      closePopover={handleClosePopover}
      panelProps={{ 'data-test-subj': testId('popoverPanel') }}
      panelPaddingSize="s"
      aria-label={i18n.translate(
        'xpack.securitySolution.endpoint.exportProviderSelector.popoverAriaLabel',
        { defaultMessage: 'Select storage provider' }
      )}
      button={
        <EuiToolTip content={EXPORT_PROVIDERS_CONFIG.tooltipText} position="top" display="block">
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none" tabIndex={0}>
            <EuiFlexItem grow={false} onClick={handleOpenPopover}>
              <div title={valueText}>{valueText || EXPORT_PROVIDERS_CONFIG.initialLabel}</div>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiToolTip>
      }
    >
      {state.isPopoverOpen && (
        <EuiSelectable
          id={EXPORT_PROVIDERS_CONFIG.selectableId}
          searchable={true}
          options={options}
          onChange={handleSelection}
          renderOption={renderOption}
          singleSelection
          searchProps={{
            placeholder: valueText || EXPORT_PROVIDERS_CONFIG.initialLabel,
            autoFocus: true,
            onKeyDown: createKeyDownHandler,
          }}
          listProps={{
            rowHeight: EXPORT_PROVIDERS_CONFIG.rowHeight,
            showIcons: true,
            textWrap: 'truncate',
            bordered: true,
          }}
          emptyMessage={
            <span data-test-subj={testId('emptyMessage')}>
              <FormattedMessage
                id="xpack.securitySolution.endpoint.exportProviderSelector.noProvidersDescription"
                defaultMessage="No storage providers are configured in this host's Elastic Defend policy. Add one on the policy's Storage providers tab."
              />
            </span>
          }
          errorMessage={
            error ? (
              <FormattedMessage
                id="xpack.securitySolution.endpoint.exportProviderSelector.loadingErrorMessage"
                defaultMessage="Error loading storage providers"
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
      <EuiIcon type="warning" size="s" color="subdued" aria-hidden={true} />{' '}
      <FormattedMessage
        id="xpack.securitySolution.endpoint.exportProviderSelector.noMultipleArgsDescription"
        defaultMessage="Argument is only supported once per command"
      />
    </EuiText>
  );
});

ExportProviderSelector.displayName = 'ExportProviderSelector';
