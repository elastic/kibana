/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ColumnType } from '@kbn/securitysolution-io-ts-list-types';
import {
  ListOperatorEnum as OperatorEnum,
  ListOperatorTypeEnum as OperatorTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  getColumnTypesSupportedByEntryType,
  isEntryTypeSupportedOnColumnType,
  isEsqlOutputColumnEntryType,
} from '@kbn/securitysolution-exceptions-common/esql_output_columns';

import {
  doesNotExistOperator,
  doesNotMatchOperator,
  existsOperator,
  isNotOneOfOperator,
  isNotOperator,
  isOneOfOperator,
  isOperator,
  matchesOperator,
} from '../autocomplete_operators';
import type { BuilderEntry, EmptyEntry, OperatorOption } from '../types';

/** The operators of the entries of an item that applies to the ES|QL output columns. There are no value lists and no nested entries. */
export const ESQL_OUTPUT_COLUMN_OPERATORS: readonly OperatorOption[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  matchesOperator,
  doesNotMatchOperator,
  existsOperator,
  doesNotExistOperator,
];

/** The column types that an operator can test, which is what the type select of an entry offers once the operator is chosen. */
export const getColumnTypesForOperator = (operator: OperatorOption): ColumnType[] =>
  isEsqlOutputColumnEntryType(operator.type)
    ? getColumnTypesSupportedByEntryType(operator.type)
    : [];

const getOperatorEnum = (entry: BuilderEntry): OperatorEnum =>
  'operator' in entry ? (entry.operator as OperatorEnum) : OperatorEnum.INCLUDED;

/** The operator that an entry of an item that applies to the ES|QL output columns shows. */
export const getEsqlOutputColumnOperator = (entry: BuilderEntry): OperatorOption =>
  ESQL_OUTPUT_COLUMN_OPERATORS.find(
    ({ operator, type }) => operator === getOperatorEnum(entry) && type === entry.type
  ) ?? isOperator;

const getColumnType = (entry: BuilderEntry): ColumnType | undefined =>
  'column_type' in entry ? entry.column_type : undefined;

const getField = (entry: BuilderEntry): string => (entry.field != null ? entry.field : '');

const getId = (entry: BuilderEntry): string => ('id' in entry && entry.id ? entry.id : uuidv4());

/** The entry that the "Add condition" button adds to an item that applies to the ES|QL output columns. */
export const getDefaultEsqlOutputColumnEntry = (): EmptyEntry => ({
  field: '',
  id: uuidv4(),
  operator: OperatorEnum.INCLUDED,
  type: OperatorTypeEnum.MATCH,
  value: '',
});

const withValue = (
  entry: BuilderEntry,
  type: OperatorTypeEnum.MATCH | OperatorTypeEnum.MATCH_ANY | OperatorTypeEnum.WILDCARD,
  value: string | string[]
): EmptyEntry & { column_type?: ColumnType } => ({
  ...('column_type' in entry && entry.column_type !== undefined
    ? { column_type: entry.column_type }
    : {}),
  field: getField(entry),
  id: getId(entry),
  operator: getOperatorEnum(entry),
  type,
  value,
});

/** Sets the field. The column of a computed field is typed by the user, so the field is any name. */
export const getEntryOnEsqlOutputColumnFieldChange = (
  entry: BuilderEntry,
  field: string
): BuilderEntry => ({ ...entry, field });

/** Sets the operator and keeps what still makes sense: the value when its shape stays the same, and the column type when the new operator supports it. */
export const getEntryOnEsqlOutputColumnOperatorChange = (
  entry: BuilderEntry,
  newOperator: OperatorOption
): BuilderEntry => {
  const previousOperator = getEsqlOutputColumnOperator(entry);
  const sameShape = previousOperator.type === newOperator.type;
  const columnType = getColumnType(entry);
  const keptColumnType =
    columnType !== undefined &&
    isEsqlOutputColumnEntryType(newOperator.type) &&
    isEntryTypeSupportedOnColumnType(newOperator.type, columnType)
      ? { column_type: columnType }
      : {};
  const previousValue = 'value' in entry ? entry.value : undefined;
  const base = {
    ...keptColumnType,
    field: getField(entry),
    id: getId(entry),
    operator: newOperator.operator,
  };

  switch (newOperator.type) {
    case OperatorTypeEnum.MATCH_ANY:
      return {
        ...base,
        type: OperatorTypeEnum.MATCH_ANY,
        value: sameShape && Array.isArray(previousValue) ? previousValue : [],
      };
    case OperatorTypeEnum.WILDCARD:
      return {
        ...base,
        type: OperatorTypeEnum.WILDCARD,
        value: sameShape && typeof previousValue === 'string' ? previousValue : '',
      };
    case OperatorTypeEnum.EXISTS:
      return { ...base, type: OperatorTypeEnum.EXISTS };
    default:
      return {
        ...base,
        type: OperatorTypeEnum.MATCH,
        value:
          typeof previousValue === 'string' && newOperator.type === previousOperator.type
            ? previousValue
            : '',
      };
  }
};

export const getEntryOnEsqlOutputColumnTypeChange = (
  entry: BuilderEntry,
  columnType: ColumnType | undefined
): BuilderEntry => {
  const { column_type: _previous, ...rest } = entry as BuilderEntry & { column_type?: ColumnType };
  return columnType === undefined ? rest : ({ ...rest, column_type: columnType } as BuilderEntry);
};

export const getEntryOnEsqlOutputColumnValueChange = (
  entry: BuilderEntry,
  value: string | string[]
): BuilderEntry => {
  if (entry.type === OperatorTypeEnum.MATCH_ANY) {
    return withValue(entry, OperatorTypeEnum.MATCH_ANY, Array.isArray(value) ? value : [value]);
  }
  if (entry.type === OperatorTypeEnum.WILDCARD) {
    return withValue(entry, OperatorTypeEnum.WILDCARD, Array.isArray(value) ? '' : value);
  }
  return withValue(entry, OperatorTypeEnum.MATCH, Array.isArray(value) ? '' : value);
};

/**
 * Whether an entry of an item that applies to the ES|QL output columns can be saved: it has a field, a column type that its operator
 * supports, and a value, which an exists entry does not have.
 */
export const isEsqlOutputColumnEntryComplete = (entry: BuilderEntry): boolean => {
  const columnType = getColumnType(entry);
  if (
    entry.field == null ||
    entry.field.trim() === '' ||
    columnType === undefined ||
    !isEsqlOutputColumnEntryType(entry.type) ||
    !isEntryTypeSupportedOnColumnType(entry.type, columnType)
  ) {
    return false;
  }
  if (entry.type === OperatorTypeEnum.EXISTS) {
    return true;
  }
  const value = 'value' in entry ? entry.value : undefined;
  return Array.isArray(value)
    ? value.length > 0 && value.every((item) => item.trim() !== '')
    : typeof value === 'string' && value.trim() !== '';
};
