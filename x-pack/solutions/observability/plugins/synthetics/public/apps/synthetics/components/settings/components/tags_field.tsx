/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
} from '@elastic/eui';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { createTagsPasteHandler, getNewTags, splitTags } from '../../common/tags_input';
import type { PrivateLocation } from '../../../../../../common/runtime_types';

export function TagsField({
  tagsList,
  control,
  errors,
  isDisabled,
}: {
  tagsList: string[];
  errors: FieldErrors;
  control: Control<PrivateLocation, any>;
  isDisabled?: boolean;
}) {
  return (
    <EuiFormRow fullWidth label={TAGS_LABEL}>
      <Controller
        name="tags"
        control={control}
        render={({ field }) => {
          const tags = field.value ?? [];

          const addTags = (rawValues: string[]) => {
            const newTags = getNewTags(tags, rawValues);

            if (newTags.length > 0) {
              field.onChange([...tags, ...newTags]);
            }
          };

          return (
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="flexStart">
              <EuiFlexItem>
                <EuiComboBox
                  isDisabled={isDisabled}
                  fullWidth
                  aria-label={TAGS_LABEL}
                  placeholder={TAGS_LABEL}
                  isInvalid={!!errors?.tags}
                  selectedOptions={tags.map((tag) => ({ label: tag, value: tag }))}
                  options={tagsList.map((tag) => ({ label: tag, value: tag }))}
                  onCreateOption={(newTag) => addTags(splitTags(newTag))}
                  onPaste={createTagsPasteHandler(addTags)}
                  {...field}
                  onChange={(selectedTags) => {
                    field.onChange(selectedTags.map((tag) => tag.value));
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={tags.join('\n')}>
                  {(copy) => (
                    <EuiButtonIcon
                      iconType="copyClipboard"
                      display="base"
                      size="m"
                      color="text"
                      onClick={copy}
                      isDisabled={tags.length === 0}
                      data-test-subj="syntheticsPrivateLocationTagsCopyButton"
                      aria-label={COPY_TAGS_LABEL}
                      title={COPY_TAGS_LABEL}
                    />
                  )}
                </EuiCopy>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        }}
      />
    </EuiFormRow>
  );
}
export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.tagsLabel', {
  defaultMessage: 'Tags',
});

const COPY_TAGS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.paramForm.copyTagsLabel',
  {
    defaultMessage: 'Copy tags',
  }
);
