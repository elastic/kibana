/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
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
          const addTags = (rawValues: string[]) => {
            const existingTags = field.value ?? [];
            const newTags = rawValues
              .map((value) => value.trim())
              .filter(
                (value, index, arr) =>
                  value.length > 0 && !existingTags.includes(value) && arr.indexOf(value) === index
              );

            if (newTags.length > 0) {
              field.onChange([...existingTags, ...newTags]);
            }
          };

          return (
            <EuiComboBox
              isDisabled={isDisabled}
              fullWidth
              aria-label={TAGS_LABEL}
              placeholder={TAGS_LABEL}
              isInvalid={!!errors?.tags}
              selectedOptions={field.value?.map((tag) => ({ label: tag, value: tag })) ?? []}
              options={tagsList.map((tag) => ({ label: tag, value: tag }))}
              onCreateOption={(newTag) => addTags(newTag.split(','))}
              onPaste={(e: React.ClipboardEvent<HTMLDivElement>) => {
                // Tags copied from badges arrive newline-separated on the clipboard, but the
                // single-line input would collapse them into one tag. Read the raw clipboard
                // and split on newlines/commas before the input sanitizes the value.
                const text = e.clipboardData.getData('text');
                if (!/[\n\r,]/.test(text)) {
                  return;
                }
                e.preventDefault();
                addTags(text.split(/[\n\r,]+/));
              }}
              {...field}
              onChange={(selectedTags) => {
                field.onChange(selectedTags.map((tag) => tag.value));
              }}
            />
          );
        }}
      />
    </EuiFormRow>
  );
}
export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.tagsLabel', {
  defaultMessage: 'Tags',
});
