/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import { Control, Controller, FieldErrors } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { PrivateLocation } from '../../../../../../common/runtime_types';

export function TagsField({
  tagsList,
  control,
  errors,
}: {
  tagsList: string[];
  errors: FieldErrors;
  control: Control<PrivateLocation, any>;
}) {
  return (
    <EuiFormRow fullWidth label={TAGS_LABEL}>
      <Controller
        name="tags"
        control={control}
        render={({ field }) => (
          <EuiComboBox
            fullWidth
            aria-label={TAGS_LABEL}
            placeholder={TAGS_LABEL}
            isInvalid={!!errors?.tags}
            selectedOptions={field.value?.map((tag) => ({ label: tag, value: tag })) ?? []}
            options={tagsList.map((tag) => ({ label: tag, value: tag }))}
            onCreateOption={(newTag) => {
              field.onChange([...(field.value ?? []), newTag]);
            }}
            {...field}
            onChange={(selectedTags) => {
              field.onChange(selectedTags.map((tag) => tag.value));
            }}
          />
        )}
      />
    </EuiFormRow>
  );
}
export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.tagsLabel', {
  defaultMessage: 'Tags',
});
