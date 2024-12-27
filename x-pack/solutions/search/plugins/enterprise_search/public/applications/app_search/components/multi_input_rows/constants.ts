/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_VALUE_BUTTON_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.multiInputRows.addValueButtonLabel',
  { defaultMessage: 'Add value' }
);

export const DELETE_ROW_VALUE_BUTTON_LABEL = (index: number) =>
  i18n.translate('xpack.enterpriseSearch.appSearch.multiInputRows.removeRowValueButtonLabel', {
    defaultMessage: 'Remove value, row {index}',
    values: { index },
  });

export const INPUT_ROW_PLACEHOLDER = i18n.translate(
  'xpack.enterpriseSearch.appSearch.multiInputRows.inputRowPlaceholder',
  { defaultMessage: 'Enter a value' }
);

export const INPUT_ROW_CONTAINER_ARIA_LABEL = i18n.translate(
  'xpack.enterpriseSearch.appSearch.multiInputRows.inputRowContainerAriaLabel',
  { defaultMessage: 'Multiple input rows' }
);
