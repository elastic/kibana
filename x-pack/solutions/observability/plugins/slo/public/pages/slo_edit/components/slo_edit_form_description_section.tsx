/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow, EuiPanel, EuiTextArea, useGeneratedHtmlId } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { TagsComboBox } from '@kbn/observability-shared-plugin/public';
import { useFetchSLOSuggestions } from '../hooks/use_fetch_suggestions';
import { CreateSLOForm } from '../types';
import { OptionalText } from './common/optional_text';
import { MAX_WIDTH } from '../constants';

export function SloEditFormDescriptionSection() {
  const { control, getFieldState } = useFormContext<CreateSLOForm>();
  const sloNameId = useGeneratedHtmlId({ prefix: 'sloName' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'sloDescription' });
  const tagsId = useGeneratedHtmlId({ prefix: 'tags' });

  const { suggestions } = useFetchSLOSuggestions();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="sloEditFormDescriptionSection"
    >
      <EuiFormRow
        fullWidth
        isInvalid={getFieldState('name').invalid}
        label={i18n.translate('xpack.slo.sloEdit.description.sloName', {
          defaultMessage: 'SLO Name',
        })}
      >
        <Controller
          name="name"
          control={control}
          rules={{ required: true }}
          render={({ field: { ref, ...field }, fieldState }) => (
            <EuiFieldText
              {...field}
              fullWidth
              isInvalid={fieldState.invalid}
              id={sloNameId}
              data-test-subj="sloFormNameInput"
              placeholder={i18n.translate('xpack.slo.sloEdit.description.sloNamePlaceholder', {
                defaultMessage: 'Name for the SLO',
              })}
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloEdit.description.sloDescription', {
          defaultMessage: 'Description',
        })}
        labelAppend={<OptionalText />}
      >
        <Controller
          name="description"
          defaultValue=""
          control={control}
          rules={{ required: false }}
          render={({ field: { ref, ...field } }) => (
            <EuiTextArea
              {...field}
              fullWidth
              id={descriptionId}
              data-test-subj="sloFormDescriptionTextArea"
              placeholder={i18n.translate(
                'xpack.slo.sloEdit.description.sloDescriptionPlaceholder',
                {
                  defaultMessage: 'A short description of the SLO',
                }
              )}
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.sloEdit.tags.label', {
          defaultMessage: 'Tags',
        })}
      >
        <Controller
          name="tags"
          control={control}
          defaultValue={[]}
          rules={{ required: false }}
          render={({ field: { ref, ...field }, fieldState }) => (
            <TagsComboBox
              id={tagsId}
              fullWidth
              aria-label={ADD_TAGS_LABEL}
              placeholder={ADD_TAGS_LABEL}
              isInvalid={fieldState.invalid}
              options={suggestions?.tags ?? []}
              selectedTags={field.value ?? []}
              onChange={field.onChange}
              onBlur={field.onBlur}
              isClearable
              data-test-subj="sloEditTagsSelector"
              copyButtonDataTestSubj="sloEditTagsCopyButton"
            />
          )}
        />
      </EuiFormRow>
    </EuiPanel>
  );
}

const ADD_TAGS_LABEL = i18n.translate('xpack.slo.sloEdit.tags.placeholder', {
  defaultMessage: 'Add tags',
});
