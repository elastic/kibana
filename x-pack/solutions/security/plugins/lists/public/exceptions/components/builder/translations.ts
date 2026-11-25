/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const FIELD = i18n.translate('xpack.lists.exceptions.builder.fieldLabel', {
  defaultMessage: 'Field',
});

export const OPERATOR = i18n.translate('xpack.lists.exceptions.builder.operatorLabel', {
  defaultMessage: 'Operator',
});

export const VALUE = i18n.translate('xpack.lists.exceptions.builder.valueLabel', {
  defaultMessage: 'Value',
});

export const DELETE_ENTRY_ARIA_LABEL = i18n.translate(
  'xpack.lists.exceptions.builder.deleteEntryAriaLabel',
  {
    defaultMessage: 'Delete entry',
  }
);

export const EXCEPTION_ITEM_ARIA_LABEL = (
  name: string,
  groupIndex: number,
  positionIndex: number
): string =>
  i18n.translate('xpack.lists.exceptions.item.ariaLabel', {
    defaultMessage: '"{name}" in group {group}, position {position} ',
    values: { group: groupIndex + 1, name, position: positionIndex + 1 },
  });

export const EXCEPTION_FIELD_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionFieldValuePlaceholder',
  {
    defaultMessage: 'Search field value...',
  }
);

export const EXCEPTION_FIELD_NESTED_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionFieldNestedPlaceholder',
  {
    defaultMessage: 'Search nested field',
  }
);

export const EXCEPTION_FIELD_LISTS_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionListsPlaceholder',
  {
    defaultMessage: 'Search for list...',
  }
);

export const EXCEPTION_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionFieldPlaceholder',
  {
    defaultMessage: 'Search',
  }
);

export const EXCEPTION_OPERATOR_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionOperatorPlaceholder',
  {
    defaultMessage: 'Operator',
  }
);

export const ADD_NESTED_DESCRIPTION = i18n.translate(
  'xpack.lists.exceptions.builder.addNestedDescription',
  {
    defaultMessage: 'Add nested condition',
  }
);

export const ADD_NON_NESTED_DESCRIPTION = i18n.translate(
  'xpack.lists.exceptions.builder.addNonNestedDescription',
  {
    defaultMessage: 'Add non-nested condition',
  }
);

export const AND = i18n.translate('xpack.lists.exceptions.andDescription', {
  defaultMessage: 'AND',
});

export const OR = i18n.translate('xpack.lists.exceptions.orDescription', {
  defaultMessage: 'OR',
});

export const CUSTOM_COMBOBOX_OPTION_TEXT = i18n.translate(
  'xpack.lists.exceptions.comboBoxCustomOptionText',
  {
    defaultMessage:
      'Select a field from the list. If your field is not available, create a custom one.',
  }
);

export const FIELD_CONFLICT_INDICES_WARNING_DESCRIPTION = i18n.translate(
  'xpack.lists.exceptions.field.mappingConflict.description',
  {
    defaultMessage:
      'This field is defined as different types across the following indices or is unmapped. This can cause unexpected query results.',
  }
);

export const CONFLICT_MULTIPLE_INDEX_DESCRIPTION = (name: string, count: number): string =>
  i18n.translate('xpack.lists.exceptions.field.index.description', {
    defaultMessage: '{name} ({count} indices)',
    values: { count, name },
  });

export const WILDCARD_WITH_IS_OPERATOR_TOOLTIP = i18n.translate(
  'xpack.lists.exceptions.builder.exceptionIsOperator.warningmessage.tooltip',
  {
    defaultMessage:
      'Using a wildcard with the "IS" operator can make an entry ineffective. Change the operator to "MATCHES" to ensure wildcards run properly.',
  }
);

export const ESQL_OUTPUT_COLUMN_FIELD_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.esqlOutputColumn.fieldPlaceholder',
  {
    defaultMessage: 'Column name',
  }
);

export const ESQL_OUTPUT_COLUMN_FIELD_HELP_TEXT = i18n.translate(
  'xpack.lists.exceptions.builder.esqlOutputColumn.fieldHelpText',
  {
    defaultMessage: 'Type the name of a column that the rule query returns.',
  }
);

export const COLUMN_TYPE = i18n.translate('xpack.lists.exceptions.builder.columnTypeLabel', {
  defaultMessage: 'Column type',
});

export const COLUMN_TYPE_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.esqlOutputColumn.columnTypePlaceholder',
  {
    defaultMessage: 'Select a type',
  }
);

export const ESQL_OUTPUT_COLUMN_VALUE_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.esqlOutputColumn.valuePlaceholder',
  {
    defaultMessage: 'Enter a value',
  }
);

export const ESQL_OUTPUT_COLUMN_VALUES_PLACEHOLDER = i18n.translate(
  'xpack.lists.exceptions.builder.esqlOutputColumn.valuesPlaceholder',
  {
    defaultMessage: 'Enter values and press Enter',
  }
);

export const ESQL_OUTPUT_COLUMN_VALUE_NOT_VALID = (value: string, columnType: string): string =>
  i18n.translate('xpack.lists.exceptions.builder.esqlOutputColumn.valueNotValid', {
    defaultMessage: '"{value}" is not a valid value for a column of type {columnType}',
    values: { columnType, value },
  });

export const ESQL_OUTPUT_COLUMN_WILDCARD_ENDS_WITH_BACKSLASH = (value: string): string =>
  i18n.translate('xpack.lists.exceptions.builder.esqlOutputColumn.wildcardEndsWithBackslash', {
    defaultMessage: 'The pattern "{value}" cannot end with a single backslash',
    values: { value },
  });

export const ESQL_OUTPUT_COLUMN_WILDCARD_TOO_LONG = (maxLength: number): string =>
  i18n.translate('xpack.lists.exceptions.builder.esqlOutputColumn.wildcardTooLong', {
    defaultMessage: 'A pattern cannot be longer than {maxLength} characters',
    values: { maxLength },
  });

export const ESQL_OUTPUT_COLUMN_OPERATOR_NOT_SUPPORTED = (columnType: string): string =>
  i18n.translate('xpack.lists.exceptions.builder.esqlOutputColumn.operatorNotSupported', {
    defaultMessage: 'This operator is not supported for a column of type {columnType}',
    values: { columnType },
  });
