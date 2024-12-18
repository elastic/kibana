/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField, fieldValidators } from '../../../../shared_imports';
import { NewTermsFieldsField } from './new_terms_fields_field';
import * as i18n from './translations';

interface NewTermsFieldsEditProps {
  path: string;
  fieldNames: string[];
}

export const NewTermsFieldsEdit = memo(function NewTermsFieldsEdit({
  path,
  fieldNames,
}: NewTermsFieldsEditProps): JSX.Element {
  return (
    <UseField
      path={path}
      config={NEW_TERMS_FIELDS_CONFIG}
      component={NewTermsFieldsField}
      componentProps={{ fieldNames }}
    />
  );
});

const NEW_TERMS_FIELDS_CONFIG = {
  label: i18n.NEW_TERMS_FIELDS_LABEL,
  helpText: i18n.HELP_TEXT,
  validations: [
    {
      validator: fieldValidators.emptyField(i18n.MIN_FIELDS_COUNT_VALIDATION_ERROR),
    },
    {
      validator: fieldValidators.maxLengthField(i18n.MAX_FIELDS_COUNT_VALIDATION_ERROR),
    },
  ],
};
