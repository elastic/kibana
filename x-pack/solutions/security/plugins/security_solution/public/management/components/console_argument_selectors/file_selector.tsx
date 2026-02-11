/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFilePicker,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  htmlIdGenerator,
} from '@elastic/eui';
import type { EuiFilePickerProps } from '@elastic/eui/src/components/form/file_picker/file_picker';
import { i18n } from '@kbn/i18n';
import type { CommandArgumentValueSelectorProps } from '../console/types';

const INITIAL_DISPLAY_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.fileSelector.initialDisplayLabel',
  { defaultMessage: 'Click to select file' }
);

const OPEN_FILE_PICKER_LABEL = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.fileSelector.filePickerButtonLabel',
  { defaultMessage: 'Open file picker' }
);

const NO_FILE_SELECTED = i18n.translate(
  'xpack.securitySolution.consoleArgumentSelectors.fileSelector.noFileSelected',
  { defaultMessage: 'No file selected' }
);

interface ArgumentFileSelectorState {
  isPopoverOpen: boolean;
}

/**
 * A Console Argument Selector component that enables the user to select a file from the local machine
 */
export const ArgumentFileSelector = memo<
  CommandArgumentValueSelectorProps<File, ArgumentFileSelectorState>
>(({ value, valueText, onChange, store: _store }) => {
  const state = useMemo<ArgumentFileSelectorState>(() => {
    return _store ?? { isPopoverOpen: true };
  }, [_store]);

  const selectedFileDisplayText = useMemo(() => {
    // When command is initiated from console input history or from a copy/paste,
    // the value is a string, so treat it as if no file is selected
    if (value && value instanceof File) {
      return valueText || INITIAL_DISPLAY_LABEL;
    }

    return INITIAL_DISPLAY_LABEL;
  }, [value, valueText]);

  const selectedFileTitleTooltip = useMemo(() => {
    // When command is initiated from console input history or from a copy/paste,
    // the value is a string, so treat it as if no file is selected
    if (value && value instanceof File) {
      return selectedFileDisplayText || NO_FILE_SELECTED;
    }

    return NO_FILE_SELECTED;
  }, [selectedFileDisplayText, value]);

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

  const filePickerUUID = useMemo(() => {
    return htmlIdGenerator('console')();
  }, []);

  const handleOpenPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, [setIsPopoverOpen]);

  const handleClosePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, [setIsPopoverOpen]);

  const handleFileSelection = useCallback<NonNullable<EuiFilePickerProps['onChange']>>(
    (selectedFiles) => {
      // Get only the first file selected
      const file = selectedFiles?.item(0);

      onChange({
        value: file ?? undefined,
        valueText: file ? file.name : '',
        store: {
          ...state,
          isPopoverOpen: false,
        },
      });
    },
    [onChange, state]
  );

  useEffect(() => {
    // If value is true, but not a File object, then reset value and valueText
    // Will happen when user might paste teh command into the console or pick from console's input history
    if (value && !(value instanceof File)) {
      onChange({
        value: undefined,
        valueText: '',
        store: state,
      });
    }
  }, [onChange, state, value]);

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
              <div className="eui-textTruncate" title={selectedFileTitleTooltip}>
                {selectedFileDisplayText}
              </div>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="folderOpen"
                size="xs"
                onClick={handleOpenPopover}
                aria-label={OPEN_FILE_PICKER_LABEL}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        {state.isPopoverOpen && (
          <EuiFilePicker
            id={filePickerUUID}
            onChange={handleFileSelection}
            fullWidth
            display="large"
            data-test-subj="console-arg-file-picker"
          />
        )}
      </EuiPopover>
    </div>
  );
});
ArgumentFileSelector.displayName = 'ArgumentFileSelector';
