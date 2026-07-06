/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiComboBox,
  type EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFormRow,
  EuiPanel,
  EuiText,
  EuiTextArea,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useFetchCompositeSloSuggestions } from '../hooks/use_fetch_composite_slo_suggestions';
import { MAX_WIDTH } from '../constants';
import type { CreateCompositeSLOForm } from '../types';

export function CompositeSloDescriptionSection() {
  const { control, getFieldState } = useFormContext<CreateCompositeSLOForm>();
  const sloNameId = useGeneratedHtmlId({ prefix: 'compositeSloName' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'compositeSloDescription' });
  const tagsId = useGeneratedHtmlId({ prefix: 'compositeSloTags' });
  const { suggestions } = useFetchCompositeSloSuggestions();

  return (
    <EuiPanel
      hasBorder={false}
      hasShadow={false}
      paddingSize="none"
      style={{ maxWidth: MAX_WIDTH }}
      data-test-subj="compositeSloDescriptionSection"
    >
      <EuiFormRow
        fullWidth
        isInvalid={getFieldState('name').invalid}
        label={i18n.translate('xpack.slo.compositeSloEdit.description.sloName', {
          defaultMessage: 'Name',
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
              data-test-subj="compositeSloFormNameInput"
              placeholder={i18n.translate(
                'xpack.slo.compositeSloEdit.description.sloNamePlaceholder',
                { defaultMessage: 'Name for the composite SLO' }
              )}
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.compositeSloEdit.description.sloDescription', {
          defaultMessage: 'Description',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.slo.compositeSloEdit.optionalLabel', {
              defaultMessage: 'Optional',
            })}
          </EuiText>
        }
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
              data-test-subj="compositeSloFormDescriptionTextArea"
              placeholder={i18n.translate(
                'xpack.slo.compositeSloEdit.description.sloDescriptionPlaceholder',
                { defaultMessage: 'A short description of the composite SLO' }
              )}
            />
          )}
        />
      </EuiFormRow>

      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.slo.compositeSloEdit.tags.label', {
          defaultMessage: 'Tags',
        })}
        labelAppend={
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.slo.compositeSloEdit.optionalLabel', {
              defaultMessage: 'Optional',
            })}
          </EuiText>
        }
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
              fullWidth
              aria-label={i18n.translate('xpack.slo.compositeSloEdit.tags.placeholder', {
                defaultMessage: 'Add tags',
              })}
              placeholder={i18n.translate('xpack.slo.compositeSloEdit.tags.placeholder', {
                defaultMessage: 'Add tags',
              })}
              isInvalid={fieldState.invalid}
              options={suggestions?.tags ?? []}
              selectedOptions={generateTagOptions(field.value)}
              onChange={(selected: EuiComboBoxOptionOption[]) => {
                field.onChange(selected.length ? selected.map((opt) => opt.value) : []);
              }}
              onCreateOption={(searchValue: string, options: EuiComboBoxOptionOption[] = []) => {
                const normalized = searchValue.trim().toLowerCase();
                if (!normalized) return;
                const values = field.value ?? [];
                if (!values.find((tag) => tag.trim().toLowerCase() === normalized)) {
                  field.onChange([...values, searchValue]);
                }
              }}
              isClearable
              data-test-subj="compositeSloEditTagsSelector"
            />
          )}
        />
      </EuiFormRow>
    </EuiPanel>
  );
}

function generateTagOptions(tags: string[] = []) {
  return tags.map((tag) => ({
    label: tag,
    value: tag,
    'data-test-subj': `${tag}Option`,
  }));
}
