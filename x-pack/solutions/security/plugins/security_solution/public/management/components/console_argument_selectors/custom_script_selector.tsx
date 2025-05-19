/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import { EuiPopover, EuiText, EuiFlexGroup, EuiFlexItem, EuiComboBox } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
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

/**
 * Option for the script dropdown
 */
interface ScriptOption {
  value: string;
  label: string;
  script: CustomScript;
}

/**
 * A Console Argument Selector component that enables the user to select a custom script
 * @param agentType The type of agent to fetch scripts for
 * @returns A component that can be used as a CommandArgumentValueSelector
 */
export const CustomScriptSelector = (agentType: ResponseActionAgentType) => {
  const CustomScriptSelectorComponent = memo<
    CommandArgumentValueSelectorProps<string, CustomScriptSelectorState>
  >(({ value, valueText, onChange, store: _store }) => {
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
    // Create options for the dropdown
    const scriptsOptions = useMemo<ScriptOption[]>(() => {
      return data.map((script: CustomScript) => ({
        value: script.id,
        label: script.name,
        script,
      }));
    }, [data]);

    // Type-safe render function for EuiComboBox options
    const renderOption = (option: ScriptOption) => {
      return (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexItem>
            <EuiText size="m" color="default" className="eui-textTruncate">
              {option.label}
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              {option.script.description || ''}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };

    const handleOpenPopover = useCallback(() => {
      setIsPopoverOpen(true);
    }, [setIsPopoverOpen]);

    const handleClosePopover = useCallback(() => {
      setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);

    const [selectedScript, setSelectedScript] = useState<ScriptOption | null>(null);
    const popoverRef = useRef<HTMLDivElement>(null);

    const handleScriptSelection = useCallback(
      (options: ScriptOption[]) => {
        const selected = options[0];
        setSelectedScript(selected);

        onChange({
          value: selected.label,
          valueText: selected.label,
          store: {
            ...state,
            isPopoverOpen: false,
          },
        });
      },
      [onChange, state]
    );

    return (
      <div ref={popoverRef}>
        <EuiPopover
          initialFocus={'#options-combobox'}
          isOpen={state.isPopoverOpen}
          closePopover={handleClosePopover}
          anchorPosition="upCenter"
          panelPaddingSize="m"
          button={
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
              <EuiFlexItem grow={false} className="eui-textTruncate" onClick={handleOpenPopover}>
                <div className="eui-textTruncate" title={valueText || NO_SCRIPT_SELECTED}>
                  {valueText || INITIAL_DISPLAY_LABEL}
                </div>
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        >
          {state.isPopoverOpen && (
            <EuiComboBox
              id="options-combobox"
              aria-label="Select a custom script"
              placeholder="Select a single option"
              singleSelection={{ asPlainText: true }}
              options={scriptsOptions}
              renderOption={renderOption}
              fullWidth
              selectedOptions={selectedScript ? [selectedScript] : []}
              onChange={handleScriptSelection}
            />
          )}
        </EuiPopover>
      </div>
    );
  });

  CustomScriptSelectorComponent.displayName = 'CustomScriptSelector';
  return CustomScriptSelectorComponent;
};
