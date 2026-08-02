/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SELECT_PLACEHOLDER = i18n.translate('xpack.pnd.hitlSchemaForm.selectPlaceholder', {
  defaultMessage: 'Select a value',
});

export const REQUIRED_FIELD = i18n.translate('xpack.pnd.hitlSchemaForm.requiredField', {
  defaultMessage: 'Required',
});

export const REQUIRED_FIELD_ERROR = i18n.translate('xpack.pnd.hitlSchemaForm.requiredFieldError', {
  defaultMessage: 'This field is required',
});

/**
 * `EuiSelect` and `EuiComboBox` must name themselves rather than lean on the
 * form row's label, so the required marker has to travel into that name.
 */
export const requiredFieldAriaLabel = (label: string): string =>
  i18n.translate('xpack.pnd.hitlSchemaForm.requiredFieldAriaLabel', {
    defaultMessage: '{label} (required)',
    values: { label },
  });
