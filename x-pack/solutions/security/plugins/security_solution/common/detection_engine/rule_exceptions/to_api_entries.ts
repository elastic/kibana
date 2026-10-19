/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionEntryInput } from '@kbn/securitysolution-exceptions-common/workflows';

/**
 * Thrown when an entry is missing the operand its operator requires. Workflow
 * step callers rewrap this as an execution error; UI callers fall back to a
 * "cannot be displayed" state.
 */
export class MissingExceptionEntryOperandError extends Error {
  constructor(entry: ExceptionEntryInput, key: 'value' | 'values' | 'list') {
    super(
      `Exception entry on field "${entry.field}" is missing \`${key}\`, required for \`${entry.operator}\` entries`
    );
    this.name = 'MissingExceptionEntryOperandError';
  }
}

/**
 * Maps the flat, UI-verb entry shape of `exceptionEntrySchema` onto the
 * exceptions API's discriminated union of entry `type` + `included`/`excluded`
 * operator. The presence checks mirror the schema's `superRefine`s, which have
 * normally already run by the time this is called; they are re-checked here to
 * narrow the optional fields.
 *
 * Lives in the plugin rather than in `@kbn/securitysolution-exceptions-common`
 * because `@kbn/securitysolution-io-ts-list-types` already depends on that
 * package: importing `EntriesArray` there would close a package cycle, and it
 * would pull the io-ts schemas into a shared page-load bundle.
 */
export const toApiEntries = (entries: ExceptionEntryInput[]): EntriesArray =>
  entries.map((entry): EntriesArray[number] => {
    const { operator, field, value, values, list } = entry;
    switch (operator) {
      case 'is':
      case 'is_not':
        if (value === undefined) {
          throw new MissingExceptionEntryOperandError(entry, 'value');
        }
        return {
          type: 'match',
          field,
          operator: operator === 'is' ? 'included' : 'excluded',
          value,
        };
      case 'matches':
      case 'does_not_match':
        if (value === undefined) {
          throw new MissingExceptionEntryOperandError(entry, 'value');
        }
        return {
          type: 'wildcard',
          field,
          operator: operator === 'matches' ? 'included' : 'excluded',
          value,
        };
      case 'is_one_of':
      case 'is_not_one_of':
        if (values === undefined) {
          throw new MissingExceptionEntryOperandError(entry, 'values');
        }
        return {
          type: 'match_any',
          field,
          operator: operator === 'is_one_of' ? 'included' : 'excluded',
          value: values,
        };
      case 'exists':
      case 'does_not_exist':
        return {
          type: 'exists',
          field,
          operator: operator === 'exists' ? 'included' : 'excluded',
        };
      case 'is_in_list':
      case 'is_not_in_list':
        if (list === undefined) {
          throw new MissingExceptionEntryOperandError(entry, 'list');
        }
        return {
          type: 'list',
          field,
          operator: operator === 'is_in_list' ? 'included' : 'excluded',
          list,
        };
      default:
        return assertUnreachableOperator(operator);
    }
  });

const assertUnreachableOperator = (operator: never): never => {
  throw new Error(`Unhandled exception entry operator: ${String(operator)}`);
};
