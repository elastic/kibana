/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  EuiPopover,
  EuiSuperSelect,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  htmlIdGenerator,
} from '@elastic/eui';
import type { EuiFilePickerProps } from '@elastic/eui/src/components/form/file_picker/file_picker';
import { i18n } from '@kbn/i18n';
import { useGetCustomScripts } from '../../hooks/custom_scripts/use_get_custom_scripts';
import type { CommandArgumentValueSelectorProps } from '../console/types';

const INITIAL_DISPLAY_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.initialDisplayLabel',
  { defaultMessage: 'Click to select script' }
);

const OPEN_FILE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.filePickerButtonLabel',
  { defaultMessage: 'Open scripts picker' }
);

const NO_FILE_SELECTED = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.customScriptSelector.noFileSelected',
  { defaultMessage: 'No script selected' }
);

interface ArgumentFileSelectorState {
  isPopoverOpen: boolean;
}

/**
 * A Console Argument Selector component that enables the user to select a file from the local machine
 */
export const CustomScriptSelector = memo<
  CommandArgumentValueSelectorProps<string, ArgumentFileSelectorState>
>(({ value, valueText, onChange, store: _store }) => {
  const state = useMemo<ArgumentFileSelectorState>(() => {
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
  console.log({ store: _store });
  const { data = [] } = useGetCustomScripts('crowdstrike');

  const scriptsOptions = useMemo(() => {
    return data.map((script) => ({
      value: script.name,
      inputDisplay: script.name,
      dropdownDisplay: (
        <>
          <strong>{script.name}</strong>
          <EuiText size="s" color="subdued">
            <p>{script.description}</p>
          </EuiText>
        </>
      ),
    }));
  }, [data]);

  const filePickerUUID = useMemo(() => {
    return htmlIdGenerator('console')();
  }, []);
  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, [setIsPopoverOpen]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const [selectedScript, setSelectedScript] = useState<string>('');
  const handleScriptSelection = useCallback<NonNullable<EuiFilePickerProps['onChange']>>(
    (selectedScript) => {
      console.log({ selectedScript });

      // Get only the first file selected
      setSelectedScript(selectedScript);
      onChange({
        value: selectedScript ?? undefined,
        valueText: selectedScript || '',
        store: {
          ...state,
          isPopoverOpen: false,
        },
      });
      // TODO fix focus back to the input and not Back > button
    },
    [onChange, state]
  );

  return (
    <div>
      <EuiPopover
        isOpen={state.isPopoverOpen}
        closePopover={handleClosePopover}
        anchorPosition="upCenter"
        initialFocus={`[id="${filePickerUUID}"]`}
        button={
          <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
            <EuiFlexItem grow={false} className="eui-textTruncate" onClick={handleOpenPopover}>
              <div className="eui-textTruncate" title={valueText || NO_FILE_SELECTED}>
                {valueText || INITIAL_DISPLAY_LABEL}
              </div>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {state.isPopoverOpen && (
          <EuiSuperSelect
            options={scriptsOptions}
            valueOfSelected={selectedScript}
            placeholder="Select an option"
            itemLayoutAlign="top"
            hasDividers
            onChange={handleScriptSelection}
          />
        )}
      </EuiPopover>
    </div>
  );
});
CustomScriptSelector.displayName = 'ArgumentFileSelector';
