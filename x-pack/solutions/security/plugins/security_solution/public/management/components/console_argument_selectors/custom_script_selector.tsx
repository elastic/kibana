/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiPopover,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiLoadingSpinner,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
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
    const scriptsOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(() => {
      return data.map((script: CustomScript) => ({
        value: script.id,
        label: script.name,
      }));
    }, [data]);

    const renderOption = (option: EuiComboBoxOptionOption<string>) => {
      const foundScript = data.find((script) => script.id === option.value);
      return (
        <>
          <strong>{option.label}</strong>
          <EuiText size="s" color="subdued" css={{ wordBreak: 'break-word', width: '100%' }}>
            <p style={{ whiteSpace: 'normal' }}>{foundScript?.description}</p>
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

    const handleScriptSelection = useCallback(
      (options: Array<EuiComboBoxOptionOption<string>>) => {
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

    if (scriptsOptions.length) {
      return (
        <EuiPopover
          initialFocus={'#options-combobox'}
          isOpen={state.isPopoverOpen}
          closePopover={handleClosePopover}
          anchorPosition="rightDown"
          panelPaddingSize="l"
          panelStyle={{
            width: '100%',
          }}
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
              rowHeight={60}
            />
          )}
        </EuiPopover>
      );
    }
    return <EuiLoadingSpinner />;
  });

  CustomScriptSelectorComponent.displayName = 'CustomScriptSelector';
  return CustomScriptSelectorComponent;
};
