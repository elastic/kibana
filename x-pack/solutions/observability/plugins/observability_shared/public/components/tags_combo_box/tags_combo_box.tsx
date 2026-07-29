/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { EuiButtonIcon, EuiComboBox, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createTagsPasteHandler, getNewTags, splitTags } from './tags_input';

// Everything except the props this component derives internally from `selectedTags` passes
// straight through to the underlying `EuiComboBox` (fullWidth, isInvalid, placeholder, etc.).
export interface TagsComboBoxProps
  extends Omit<
    EuiComboBoxProps<string>,
    'selectedOptions' | 'onChange' | 'onCreateOption' | 'onPaste'
  > {
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  copyButtonDataTestSubj?: string;
}

const COPY_TAGS_LABEL = i18n.translate('xpack.observabilityShared.tagsComboBox.copyTagsLabel', {
  defaultMessage: 'Copy tags',
});

/**
 * Tags input built on `EuiComboBox` that splits comma/newline-separated values (typed or
 * pasted) into one tag per value and de-duplicates them, with a copy button that puts all
 * tags on the clipboard newline-separated. Shared across observability tag fields.
 */
export function TagsComboBox({
  selectedTags,
  onChange,
  copyButtonDataTestSubj,
  ...euiComboBoxProps
}: TagsComboBoxProps) {
  const selectedOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => selectedTags.map((tag) => ({ label: tag, value: tag })),
    [selectedTags]
  );

  const addTags = useCallback(
    (rawValues: string[]) => {
      const newTags = getNewTags(selectedTags, rawValues);
      if (newTags.length > 0) {
        onChange([...selectedTags, ...newTags]);
      }
    },
    [onChange, selectedTags]
  );

  const onComboChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => {
      onChange(selected.map((option) => option.value ?? option.label));
    },
    [onChange]
  );

  const onCreateOption = useCallback(
    (searchValue: string) => addTags(splitTags(searchValue)),
    [addTags]
  );

  const onPaste = useMemo(() => createTagsPasteHandler(addTags), [addTags]);

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="flexStart">
      <EuiFlexItem>
        <EuiComboBox<string>
          {...euiComboBoxProps}
          selectedOptions={selectedOptions}
          onChange={onComboChange}
          onCreateOption={onCreateOption}
          onPaste={onPaste}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy
          textToCopy={selectedTags.join('\n')}
          beforeMessage={COPY_TAGS_LABEL}
          tooltipProps={{ disableScreenReaderOutput: true }}
        >
          {(copy) => (
            /* eslint-disable-next-line @elastic/eui/tooltip-button-icon-wrap */
            <EuiButtonIcon
              iconType="copyClipboard"
              display="base"
              size="m"
              color="text"
              onClick={copy}
              isDisabled={selectedTags.length === 0}
              data-test-subj={copyButtonDataTestSubj}
              aria-label={COPY_TAGS_LABEL}
              title={COPY_TAGS_LABEL}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

// eslint-disable-next-line import/no-default-export
export default TagsComboBox;
