/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiButtonIcon, EuiComboBox, EuiCopy, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createTagsPasteHandler, getNewTags, splitTags } from '../../common/tags_input';

export interface FormattedComboBoxProps {
  onChange: (value: string[]) => void;
  onBlur?: () => void;
  selectedOptions: string[];
  // Opt-in copy button; the combo box steals focus on click, so pills can't be
  // drag-selected/copied. Only meaningful for tag-like fields.
  enableCopy?: boolean;
}

export const FormattedComboBox = ({
  onChange,
  onBlur,
  selectedOptions,
  enableCopy = false,
  ...props
}: FormattedComboBoxProps) => {
  const [formattedSelectedOptions, setSelectedOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >(selectedOptions.map((option) => ({ label: option, key: option })));
  const [isInvalid, setInvalid] = useState(false);

  const onOptionsChange = useCallback(
    (options: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedOptions(options);
      const formattedTags = options.map((option) => option.label);
      onChange(formattedTags);
      setInvalid(false);
    },
    [onChange, setSelectedOptions, setInvalid]
  );

  const addTags = useCallback(
    (rawValues: string[]) => {
      const newTags = getNewTags(selectedOptions, rawValues);

      if (newTags.length === 0) {
        return;
      }

      onChange([...selectedOptions, ...newTags]);
      setSelectedOptions([...formattedSelectedOptions, ...newTags.map((label) => ({ label }))]);
    },
    [onChange, formattedSelectedOptions, selectedOptions, setSelectedOptions]
  );

  const onCreateOption = useCallback((tag: string) => addTags(splitTags(tag)), [addTags]);

  const onPaste = useMemo(() => createTagsPasteHandler(addTags), [addTags]);

  const onSearchChange = useCallback(
    (searchValue: string) => {
      if (!searchValue) {
        setInvalid(false);

        return;
      }

      setInvalid(!isValid(searchValue));
    },
    [setInvalid]
  );

  const comboBox = (
    <EuiComboBox<string>
      data-test-subj="syntheticsFleetComboBox"
      noSuggestions
      selectedOptions={formattedSelectedOptions}
      onCreateOption={onCreateOption}
      onChange={onOptionsChange}
      onBlur={() => onBlur?.()}
      onSearchChange={onSearchChange}
      onPaste={onPaste}
      isInvalid={isInvalid}
      {...props}
    />
  );

  if (!enableCopy) {
    return comboBox;
  }

  const tagsToCopy = formattedSelectedOptions.map((option) => option.label).join('\n');

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="flexStart">
      <EuiFlexItem>{comboBox}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiCopy textToCopy={tagsToCopy}>
          {(copy) => (
            <EuiButtonIcon
              iconType="copyClipboard"
              display="base"
              size="m"
              color="text"
              onClick={copy}
              isDisabled={formattedSelectedOptions.length === 0}
              data-test-subj="syntheticsFleetComboBoxCopyButton"
              aria-label={i18n.translate('xpack.synthetics.comboBox.copyTagsAriaLabel', {
                defaultMessage: 'Copy tags',
              })}
              title={i18n.translate('xpack.synthetics.comboBox.copyTagsTitle', {
                defaultMessage: 'Copy tags',
              })}
            />
          )}
        </EuiCopy>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const isValid = (value: string) => {
  // Ensure that the tag is more than whitespace
  return value.match(/\S+/) !== null;
};
