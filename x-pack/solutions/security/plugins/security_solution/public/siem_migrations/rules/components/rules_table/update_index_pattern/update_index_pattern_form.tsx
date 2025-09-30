/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { DEFAULT_INDEX_KEY } from '../../../../../../common/constants';
import { useKibana } from '../../../../../common/lib/kibana';
import { IndexPatternPlaceholderFormWrapper } from './flyout';
import type { FormSchema } from '../../../../../shared_imports';
import {
  Field,
  FIELD_TYPES,
  fieldValidators,
  getUseField,
  useForm,
} from '../../../../../shared_imports';

import * as i18n from './translations';

const CommonUseField = getUseField({ component: Field });

interface IndexPatternsFormData {
  index: string[];
}

const schema: FormSchema<IndexPatternsFormData> = {
  index: {
    fieldsToValidateOnChange: ['index'],
    type: FIELD_TYPES.COMBO_BOX,
    validations: [
      {
        validator: fieldValidators.emptyField(i18n.UPDATE_INDEX_PATTERN_REQUIRED_ERROR),
      },
    ],
  },
};

const initialFormData: IndexPatternsFormData = {
  index: [],
};

interface UpdateIndexPatternFormProps {
  onClose: () => void;
  onSubmit: (indexPattern: string) => void;
}

export const UpdateIndexPatternForm = memo(({ onClose, onSubmit }: UpdateIndexPatternFormProps) => {
  const { form } = useForm({
    defaultValue: initialFormData,
    schema,
  });

  const { uiSettings } = useKibana().services;
  const defaultPatterns = uiSettings.get<string[]>(DEFAULT_INDEX_KEY);

  return (
    <IndexPatternPlaceholderFormWrapper
      form={form}
      title={i18n.INDEX_PATTERN_PLACEHOLDER_FORM_TITLE}
      onClose={onClose}
      onSubmit={onSubmit}
    >
      <CommonUseField
        path="index"
        config={{
          ...schema.index,
          label: i18n.INDEX_PATTERN_PLACEHOLDER_FORM_TITLE,
          helpText: i18n.INDEX_PATTERN_PLACEHOLDER_FORM_HELP_TEXT,
        }}
        componentProps={{
          idAria: 'updateIndexPatternIndexPatterns',
          'data-test-subj': 'updateIndexPatternIndexPatterns',
          euiFieldProps: {
            fullWidth: true,
            placeholder: '',
            noSuggestions: false,
            options: defaultPatterns.map((label) => ({ label })),
          },
        }}
      />
    </IndexPatternPlaceholderFormWrapper>
  );
});

UpdateIndexPatternForm.displayName = 'UpdateIndexPatternForm';
