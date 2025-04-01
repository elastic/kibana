/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const DOES_NOT_EXIST = i18n.translate(
  'xpack.securitySolution.editDataProvider.doesNotExistLabel',
  {
    defaultMessage: 'does not exist',
  }
);

export const EXISTS = i18n.translate('xpack.securitySolution.editDataProvider.existsLabel', {
  defaultMessage: 'exists',
});

export const FIELD = i18n.translate('xpack.securitySolution.editDataProvider.fieldLabel', {
  defaultMessage: 'Field',
});

export const FIELD_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.editDataProvider.placeholder',
  {
    defaultMessage: 'Select a field',
  }
);

export const IS = i18n.translate('xpack.securitySolution.editDataProvider.isLabel', {
  defaultMessage: 'is',
});

export const IS_ONE_OF = i18n.translate('xpack.securitySolution.editDataProvider.isOneOfLabel', {
  defaultMessage: 'is one of',
});

export const IS_NOT = i18n.translate('xpack.securitySolution.editDataProvider.isNotLabel', {
  defaultMessage: 'is not',
});

export const IS_NOT_ONE_OF = i18n.translate(
  'xpack.securitySolution.editDataProvider.isNotOneOfLabel',
  {
    defaultMessage: 'is not one of',
  }
);

export const ENTER_ONE_OR_MORE_VALUES = i18n.translate(
  'xpack.securitySolution.editDataProvider.includesPlaceholder',
  {
    defaultMessage: 'enter one or more values',
  }
);

export const OPERATOR = i18n.translate('xpack.securitySolution.editDataProvider.operatorLabel', {
  defaultMessage: 'Operator',
});

export const SAVE = i18n.translate('xpack.securitySolution.editDataProvider.saveButton', {
  defaultMessage: 'Save',
});

export const VALUE = i18n.translate('xpack.securitySolution.editDataProvider.valuePlaceholder', {
  defaultMessage: 'value',
});

export const VALUE_LABEL = i18n.translate('xpack.securitySolution.editDataProvider.valueLabel', {
  defaultMessage: 'Value',
});

export const SELECT_AN_OPERATOR = i18n.translate(
  'xpack.securitySolution.editDataProvider.selectAnOperatorPlaceholder',
  {
    defaultMessage: 'Select an operator',
  }
);

export const UNAVAILABLE_OPERATOR = (operator: string) =>
  i18n.translate('xpack.securitySolution.editDataProvider.unavailableOperator', {
    values: { operator },
    defaultMessage: '{operator} operator is unavailable with templates',
  });
