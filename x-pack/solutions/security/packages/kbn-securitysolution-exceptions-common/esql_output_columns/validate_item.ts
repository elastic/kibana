/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ExceptionAppliesTo } from './applies_to';
import { EXCEPTION_APPLIES_TO, getExceptionAppliesTo } from './applies_to';
import { isEsqlOutputColumnType } from './column_types';
import { isEntryTypeSupportedOnColumnType, isEsqlOutputColumnEntryType } from './entry_support';
import type { InvalidValueProblem } from './validate_value';
import { describeInvalidValueProblem, getInvalidValueProblem } from './validate_value';

/** The part of an entry that the validation reads: both the stored entries and the entries of a request fit it. */
interface EntryLike {
  type: string;
  field: string;
  column_type?: string;
  value?: unknown;
  entries?: readonly EntryLike[];
}

/** The lists that can hold an item that applies to the ES|QL output columns. The rest are for Endpoint artifacts, which have no ES|QL output. */
const LIST_TYPES_THAT_CAN_HOLD_ESQL_OUTPUT_COLUMNS_ITEMS: ReadonlySet<string> = new Set([
  'detection',
  'rule_default',
]);

export interface ValidateEsqlOutputColumnsItemOptions {
  appliesTo: ExceptionAppliesTo | null | undefined;
  entries: readonly EntryLike[];
  osTypes: readonly string[] | null | undefined;
  /** The type of the list that holds the item, when it is known. */
  listType: string | undefined;
}

const getColumnTypeFields = (entries: readonly EntryLike[]): string[] =>
  entries.flatMap(({ field, column_type: columnType, entries: inner = [] }) => [
    ...(columnType !== undefined ? [field] : []),
    ...getColumnTypeFields(inner),
  ]);

const getValues = (entry: EntryLike): string[] => {
  if (entry.type === 'match' || entry.type === 'wildcard') {
    return typeof entry.value === 'string' ? [entry.value] : [];
  }
  if (entry.type === 'match_any' && Array.isArray(entry.value)) {
    return entry.value.filter((value): value is string => typeof value === 'string');
  }
  return [];
};

/** A value of an entry that the type of its column cannot be tested with, and why. */
export interface EntryValueProblem {
  value: string;
  problem: InvalidValueProblem;
}

/**
 * The problems of the values of an entry, for an entry with a supported type and a known column type: one for each value that the
 * column type cannot be tested with. The form of the exception flyout shows them while the user types, and the API returns them.
 * An entry with no column type yet, or with a type that does not exist, has no problem here (`getEsqlOutputColumnsItemErrors`
 * reports those).
 */
export const getEntryValueProblems = (entry: {
  type: string;
  column_type?: string;
  value?: unknown;
}): EntryValueProblem[] => {
  const { type, column_type: columnType } = entry;
  if (
    !isEsqlOutputColumnEntryType(type) ||
    columnType === undefined ||
    !isEsqlOutputColumnType(columnType)
  ) {
    return [];
  }
  return getValues({ ...entry, field: '' }).flatMap((value) => {
    const problem = getInvalidValueProblem({ columnType, entryType: type, value });
    return problem === undefined ? [] : [{ value, problem }];
  });
};

const getEntryErrors = (entry: EntryLike): string[] => {
  const { type, field, column_type: columnType } = entry;
  const prefix = `the entry on the field "${field}"`;
  if (!isEsqlOutputColumnEntryType(type)) {
    return [
      `${prefix} has the type "${type}", and only match, match_any, wildcard and exists are supported`,
    ];
  }
  if (columnType === undefined) {
    return [`${prefix} needs a column_type`];
  }
  if (!isEsqlOutputColumnType(columnType)) {
    return [`${prefix} has the column_type "${columnType}", which is not supported`];
  }
  if (!isEntryTypeSupportedOnColumnType(type, columnType)) {
    return [`${prefix} of type ${type} is not supported on a column of type ${columnType}`];
  }
  return getEntryValueProblems(entry).map(
    ({ problem }) => `${prefix}: ${describeInvalidValueProblem(problem)}`
  );
};

/** Why the item cannot be saved, one message for each problem. An empty list means that the item is valid. */
export const getEsqlOutputColumnsItemErrors = ({
  appliesTo,
  entries,
  osTypes,
  listType,
}: ValidateEsqlOutputColumnsItemOptions): string[] => {
  if (getExceptionAppliesTo({ applies_to: appliesTo }) === EXCEPTION_APPLIES_TO.SOURCE_DOCUMENTS) {
    const fields = getColumnTypeFields(entries);
    return fields.length > 0
      ? [
          `column_type can only be set on the entries of an item that applies to "${
            EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS
          }" (found on the fields ${fields.map((field) => `"${field}"`).join(', ')})`,
        ]
      : [];
  }

  const errors: string[] = [];
  if (osTypes != null && osTypes.length > 0) {
    errors.push(
      `an item that applies to "${EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS}" cannot have os_types`
    );
  }
  if (listType !== undefined && !LIST_TYPES_THAT_CAN_HOLD_ESQL_OUTPUT_COLUMNS_ITEMS.has(listType)) {
    errors.push(
      `an item that applies to "${EXCEPTION_APPLIES_TO.ESQL_OUTPUT_COLUMNS}" can only be in a detection or rule_default list, and this list has the type "${listType}"`
    );
  }
  return [...errors, ...entries.flatMap(getEntryErrors)];
};
