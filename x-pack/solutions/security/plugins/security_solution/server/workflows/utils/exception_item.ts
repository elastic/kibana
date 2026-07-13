/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import type {
  CreateExceptionListItemSchema,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import { assertUnreachable } from '../../../common/utility_types';
import type {
  ExceptionEntryInput,
  ExceptionItemBaseInput,
  ExceptionItemOutput,
} from '../../../common/workflows/step_types/common/exception_item_schemas';
import { exceptionItemOutputSchema } from '../../../common/workflows/step_types/common/exception_item_schemas';

/**
 * The exception item fields both creation APIs accept, i.e. a create-item
 * request body without the list targeting (`list_id` / `namespace_type`).
 */
type CreateExceptionItemBody = Pick<
  CreateExceptionListItemSchema,
  'name' | 'description' | 'type' | 'entries' | 'os_types' | 'tags' | 'expire_time' | 'comments'
>;

const missingEntryKey = (entry: ExceptionEntryInput, key: 'value' | 'values' | 'list') =>
  new ExecutionError({
    type: 'ValidationError',
    message: `Exception entry on field "${entry.field}" is missing \`${key}\`, required for \`${entry.operator}\` entries`,
  });

/**
 * Maps the step's flat, UI-verb entry shape (see `exceptionEntrySchema`) onto
 * the exceptions API's discriminated union of entry `type` + `included`/
 * `excluded` operator. The presence checks mirror the schema's
 * `superRefine`s, which have already run by the time the handler is invoked;
 * they are re-checked here to narrow the optional fields.
 */
export const toApiEntries = (entries: ExceptionEntryInput[]): EntriesArray =>
  entries.map((entry) => {
    const { operator, field, value, values, list } = entry;
    switch (operator) {
      case 'is':
      case 'is_not':
        if (value === undefined) {
          throw missingEntryKey(entry, 'value');
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
          throw missingEntryKey(entry, 'value');
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
          throw missingEntryKey(entry, 'values');
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
          throw missingEntryKey(entry, 'list');
        }
        return {
          type: 'list',
          field,
          operator: operator === 'is_in_list' ? 'included' : 'excluded',
          list,
        };
      default:
        return assertUnreachable(operator);
    }
  });

/**
 * Builds the create-item request body shared by the rule exceptions API and
 * the exception list items API from the step's item fields.
 */
export const toCreateExceptionItemBody = (
  input: ExceptionItemBaseInput
): CreateExceptionItemBody => {
  const { name, description, entries, os_types: osTypes, tags, expire_time: expireTime } = input;
  const comments = input.comments?.map((comment) => ({ comment }));

  return {
    name,
    // `description` is required by the APIs but rarely adds anything beyond
    // `name` in a workflow, so the step input keeps it optional.
    description: description ?? '',
    type: 'simple',
    entries: toApiEntries(entries),
    ...(osTypes && osTypes.length > 0 ? { os_types: osTypes } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    ...(expireTime !== undefined ? { expire_time: expireTime } : {}),
    ...(comments && comments.length > 0 ? { comments } : {}),
  };
};

/**
 * Builds the step output from a created exception item response body by
 * parsing it with `exceptionItemOutputSchema` (a non-strict object), which
 * both validates the fields the step promises and strips everything else.
 *
 * @param body   The created item (for the rule exceptions API, one element of
 *               the response array).
 * @param action Short verb phrase for the failure message, e.g. `create rule exception`.
 */
export const toExceptionItemOutput = (
  body: unknown,
  action: string
): { output: ExceptionItemOutput } => {
  const parsed = exceptionItemOutputSchema.safeParse(body);
  if (!parsed.success) {
    // Surfaced in the execution detail's Error tab: `path: message` per issue
    // (safe scalars only; the response body itself is never persisted).
    throw new ExecutionError({
      type: 'ApiError',
      message: `Failed to ${action}: unexpected exception item response shape`,
      details: { issues: stringifyZodError(parsed.error) },
    });
  }
  return { output: parsed.data };
};
