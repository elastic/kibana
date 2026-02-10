/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import type { CreateSLOForm } from '../../types';
import { useFetchSLOSuggestions } from '../../hooks/use_fetch_suggestions';
import { useSloFormContext } from '../slo_form_context';
import { OptionalText } from '../common/optional_text';

export function TagsField() {
  const { isFlyout } = useSloFormContext();
  const { control } = useFormContext<CreateSLOForm>();
  const tagsId = useGeneratedHtmlId({ prefix: 'tags' });
  const { suggestions } = useFetchSLOSuggestions();

  return (
    <EuiFormRow
      fullWidth={isFlyout}
      label={i18n.translate('xpack.slo.sloEdit.tags.label', {
        defaultMessage: 'Tags',
      })}
      labelAppend={<OptionalText />}
    >
      <Controller
        name="tags"
        control={control}
        defaultValue={[]}
        rules={{ required: false }}
        render={({ field: { ref, ...field }, fieldState }) => (
          <EuiComboBox
            {...field}
            id={tagsId}
            fullWidth={isFlyout}
            aria-label={i18n.translate('xpack.slo.sloEdit.tags.placeholder', {
              defaultMessage: 'Add tags',
            })}
            placeholder={i18n.translate('xpack.slo.sloEdit.tags.placeholder', {
              defaultMessage: 'Add tags',
            })}
            isInvalid={fieldState.invalid}
            options={suggestions?.tags ?? []}
            selectedOptions={generateTagOptions(field.value)}
            onChange={(selected: EuiComboBoxOptionOption[]) => {
              if (selected.length) {
                return field.onChange(selected.map((opts) => opts.value));
              }

              field.onChange([]);
            }}
            onCreateOption={(searchValue: string, options: EuiComboBoxOptionOption[] = []) => {
              const normalizedSearchValue = searchValue.trim().toLowerCase();

              if (!normalizedSearchValue) {
                return;
              }
              const values = field.value ?? [];

              if (
                values.findIndex((tag) => tag.trim().toLowerCase() === normalizedSearchValue) === -1
              ) {
                field.onChange([...values, searchValue]);
              }
            }}
            isClearable
            data-test-subj="sloEditTagsSelector"
          />
        )}
      />
    </EuiFormRow>
  );
}

function generateTagOptions(tags: string[] = []) {
  return tags.map((tag) => ({
    label: tag,
    value: tag,
    'data-test-subj': `${tag}Option`,
  }));
}
