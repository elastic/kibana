/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import type { EuiSelectableOption } from '@elastic/eui';
import { EuiBadge, EuiButton, EuiPanel, EuiSelectable, EuiText } from '@elastic/eui';
import type { DetonateSample } from './submit_modal';
import * as i18n from './select_file_translations';

export const DETONATE_FILE_PANEL_ID = 'DETONATE_SELECT_FILE_PANEL_ID';
export const DETONATE_FILE_PANEL_WIDTH = 400;

export interface DetonateFileOption extends DetonateSample {
  id: string;
  /** Short description shown under the file name. */
  description: string;
  /** Label of the badge shown on the right, when the file has one. */
  badge?: string;
  /** EUI badge color for the badge. Defaults to a neutral hollow badge. */
  badgeColor?: string;
}

interface DetonateSelectFilePanelProps {
  files: DetonateFileOption[];
  onContinue: (file: DetonateFileOption) => void;
  /** Shows a spinner on the Continue button and disables the panel while submitting. */
  isSubmitting?: boolean;
  /** Label of the primary button. Defaults to "Continue". */
  submitLabel?: string;
}

type FileSelectableOption = EuiSelectableOption;

const getFile = (option: FileSelectableOption) => option.data?.file as DetonateFileOption;

// `renderOption` receives the option's `data` fields merged onto the option itself (so there is
// no `option.data` there), while the options kept in state still carry `data`.
const getRenderedFile = (option: FileSelectableOption): DetonateFileOption | undefined =>
  (option as FileSelectableOption & { file?: DetonateFileOption }).file ?? option.data?.file;

const toOption = (file: DetonateFileOption): FileSelectableOption => ({
  key: file.id,
  label: file.fileName,
  data: { file },
  append: file.badge ? (
    <EuiBadge color={file.badgeColor ?? 'hollow'} data-test-subj={`detonateFileBadge-${file.id}`}>
      {file.badge}
    </EuiBadge>
  ) : undefined,
});

/**
 * Panel of the Take action menu that lets users pick the file to detonate, before the submit
 * modal opens. Shaped like the "Select workflow" panel: search, option list, primary button.
 */
export const DetonateSelectFilePanel = memo(
  ({ files, onContinue, isSubmitting = false, submitLabel }: DetonateSelectFilePanelProps) => {
    const initialOptions = useMemo(() => files.map(toOption), [files]);
    const [options, setOptions] = useState<FileSelectableOption[]>(initialOptions);

    const selected = useMemo(() => {
      const checked = options.find((option) => option.checked === 'on');
      return checked ? getFile(checked) : undefined;
    }, [options]);

    const handleContinue = useCallback(() => {
      if (selected) {
        onContinue(selected);
      }
    }, [selected, onContinue]);

    return (
      <div data-test-subj="detonateSelectFilePanel">
        <EuiSelectable<FileSelectableOption>
          aria-label={i18n.PANEL_TITLE}
          searchable
          singleSelection
          options={options}
          onChange={setOptions}
          searchProps={{ placeholder: i18n.SEARCH_PLACEHOLDER, compressed: false }}
          noMatchesMessage={i18n.NO_FILES}
          listProps={{ showIcons: false, rowHeight: 56, onFocusBadge: false }}
          renderOption={(option) => (
            <>
              <EuiText size="s">{option.label}</EuiText>
              <EuiText size="xs" color="subdued" css={css({ whiteSpace: 'normal' })}>
                {getRenderedFile(option)?.description}
              </EuiText>
            </>
          )}
          height={180}
        >
          {(list, search) => (
            <>
              <EuiPanel paddingSize="s" hasShadow={false} color="transparent">
                {search}
              </EuiPanel>
              {list}
            </>
          )}
        </EuiSelectable>
        <EuiPanel paddingSize="s" hasShadow={false} color="transparent">
          <EuiButton
            fill
            fullWidth
            isDisabled={!selected || isSubmitting}
            isLoading={isSubmitting}
            onClick={handleContinue}
            data-test-subj="detonateSelectFileContinue"
          >
            {submitLabel ?? i18n.CONTINUE}
          </EuiButton>
        </EuiPanel>
      </div>
    );
  }
);

DetonateSelectFilePanel.displayName = 'DetonateSelectFilePanel';
