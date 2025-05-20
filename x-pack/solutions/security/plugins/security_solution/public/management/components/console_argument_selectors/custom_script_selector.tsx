/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiPanel,
  EuiPopover,
  EuiText,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelectable,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import type { ResponseActionAgentType } from '../../../../common/endpoint/service/response_actions/constants';
import { useGetCustomScripts } from '../../hooks/custom_scripts/use_get_custom_scripts';
import type { CommandArgumentValueSelectorProps } from '../console/types';
import type { CustomScript } from '../../../../common/endpoint/types/custom_scripts';

const INITIAL_DISPLAY_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.initialDisplayLabel',
  { defaultMessage: 'Click to select script' }
);

const NO_SCRIPT_SELECTED = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.noFileSelected',
  { defaultMessage: 'No script selected' }
);

/**
 * State for the custom script selector component
 */
interface CustomScriptSelectorState {
  isPopoverOpen: boolean;
}

type SelectableOption = EuiSelectableOption<Partial<{ description: CustomScript['description'] }>>;

/**
 * A Console Argument Selector component that enables the user to select a custom script
 * @param agentType The type of agent to fetch scripts for
 * @returns A component that can be used as a CommandArgumentValueSelector
 */
export const CustomScriptSelector = (agentType: ResponseActionAgentType) => {
  const CustomScriptSelectorComponent = memo<
    CommandArgumentValueSelectorProps<string, CustomScriptSelectorState>
  >(({ value, valueText, onChange, store: _store, inputRef }) => {
    const state = useMemo<CustomScriptSelectorState>(() => {
      return _store ?? { isPopoverOpen: true };
    }, [_store]);
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

    const { data = [] } = useGetCustomScripts(agentType);
    const scriptsOptions: SelectableOption[] = useMemo(() => {
      return data.map((script: CustomScript) => ({
        label: script.name,
        description: script.description,
      }));
    }, [data]);

    const renderOption = (option: SelectableOption) => {
      return (
        <>
          <EuiTitle size="xxs">
            <p data-test-subj={`${option.label}-label`}>{option.label}</p>
          </EuiTitle>
          <EuiText
            data-test-subj={`${option.label}-description`}
            size="s"
            className="eui-textTruncate"
          >
            {option?.description}
          </EuiText>
        </>
      );
    };

    const handleOpenPopover = useCallback(() => {
      setIsPopoverOpen(true);
    }, [setIsPopoverOpen]);

    const handleClosePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);

    const [selectedScript, setSelectedScript] = useState<EuiComboBoxOptionOption<string> | null>(
      null
    );

    // Focus on the input element when the popover closes after selection
    useEffect(() => {
      if (!state.isPopoverOpen) {
        // Use setTimeout to ensure focus happens after the popover closes
        setTimeout(() => {
          if (inputRef?.current) {
            inputRef?.current.focus(true);
          }
        }, 0);
      }
    }, [state.isPopoverOpen, selectedScript, inputRef]);

    const handleScriptSelection = useCallback(
      (options: EuiSelectableOption[]) => {
        // Find the first option that is checked (selected)
        const selected = options.find((option: EuiSelectableOption) => option.checked === 'on');
        if (selected) {
          setSelectedScript({
            label: selected.label,
          });

          onChange({
            value: selected.label,
            valueText: selected.label,
            store: {
              ...state,
              isPopoverOpen: false,
            },
          });
        }
      },
      [onChange, state]
    );

    if (scriptsOptions.length) {
      return (
        <EuiPopover
          isOpen={state.isPopoverOpen}
          panelStyle={{
            padding: 0,
            transform: 'translateY(-10px)',
          }}
          closePopover={handleClosePopover}
          button={
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false} onClick={handleOpenPopover}>
                <div title={valueText || NO_SCRIPT_SELECTED}>
                  {valueText || INITIAL_DISPLAY_LABEL}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          {state.isPopoverOpen && (
            <EuiPanel paddingSize="none" css={{ minWidth: 400 }}>
              <EuiSelectable
                id="options-combobox"
                searchable={true}
                options={scriptsOptions}
                onChange={handleScriptSelection}
                renderOption={renderOption}
                singleSelection
                searchProps={{
                  autoFocus: true,
                  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
                    // Only stop propagation for typing keys, not for navigation keys - otherwise input lose focus
                    if (
                      event.key !== 'Enter' &&
                      event.key !== 'ArrowUp' &&
                      event.key !== 'ArrowDown' &&
                      event.key !== 'Escape'
                    ) {
                      event.stopPropagation();
                    }
                  },
                }}
                listProps={{
                  rowHeight: 60,
                  showIcons: false,
                  textWrap: 'truncate',
                }}
              >
                {(list, search) => (
                  <>
                    {search}
                    {list}
                  </>
                )}
              </EuiSelectable>
            </EuiPanel>
          )}
        </EuiPopover>
      );
    }
    return <EuiLoadingSpinner />;
  });

  CustomScriptSelectorComponent.displayName = 'CustomScriptSelector';
  return CustomScriptSelectorComponent;
};
