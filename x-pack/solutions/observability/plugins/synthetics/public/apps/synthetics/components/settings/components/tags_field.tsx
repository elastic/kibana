/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { Control, FieldErrors } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { TagsComboBox } from '@kbn/observability-shared-plugin/public';
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
        render={({ field }) => (
          <TagsComboBox
            isDisabled={isDisabled}
            fullWidth
            aria-label={TAGS_LABEL}
            placeholder={TAGS_LABEL}
            isInvalid={!!errors?.tags}
            selectedTags={field.value ?? []}
            options={tagsList.map((tag) => ({ label: tag, value: tag }))}
            onChange={field.onChange}
            onBlur={field.onBlur}
            copyButtonDataTestSubj="syntheticsPrivateLocationTagsCopyButton"
          />
        )}
      />
    </EuiFormRow>
  );
}
export const TAGS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.paramForm.tagsLabel', {
  defaultMessage: 'Tags',
});
