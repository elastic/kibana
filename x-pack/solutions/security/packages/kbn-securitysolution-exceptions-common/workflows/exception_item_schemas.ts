/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { i18n } from '@kbn/i18n';
import { ListType } from '@kbn/securitysolution-lists-common/api';
import {
  ExceptionListItem,
  ExceptionListItemDescription,
  ExceptionListItemName,
  ExceptionListItemOsTypeArray,
  ExceptionListItemTags,
} from '../api';

/**
 * Entry operators, mirroring the operator labels of the exceptions UI. Each
 * verb maps onto an API entry `type` + `operator` (included/excluded) pair;
 * see `toApiEntries` in the server workflows utils.
 */
export const exceptionEntryOperatorSchema = z.enum([
  'is',
  'is_not',
  'is_one_of',
  'is_not_one_of',
  'matches',
  'does_not_match',
  'exists',
  'does_not_exist',
  'is_in_list',
  'is_not_in_list',
]);

/**
 * The key each operator takes its operand from. `exists` / `does_not_exist`
 * take none.
 */
const OPERAND_KEY_BY_OPERATOR: Record<
  z.infer<typeof exceptionEntryOperatorSchema>,
  'value' | 'values' | 'list' | undefined
> = {
  is: 'value',
  is_not: 'value',
  matches: 'value',
  does_not_match: 'value',
  is_one_of: 'values',
  is_not_one_of: 'values',
  exists: undefined,
  does_not_exist: undefined,
  is_in_list: 'list',
  is_not_in_list: 'list',
};

/**
 * A single exception item condition.
 *
 * The exceptions API models entries as a discriminated union keyed on a
 * `type` field (with `match_any` reusing `value` for its string array).
 * Unions in step input schemas currently break workflow validation for
 * template-string inputs (see the note on `bulkRuleSelectorSchema`), so this
 * is a flat object instead, keyed on a UI-style `operator` verb: `value`
 * carries the single value of `is`/`is_not`/`matches`/`does_not_match`
 * entries (`matches`/`does_not_match` support `*` and `?` wildcards),
 * `values` the array of `is_one_of`/`is_not_one_of` entries, and `list` the
 * value-list reference of `is_in_list`/`is_not_in_list` entries. The
 * per-operator requirements are `superRefine`s, which surface at workflow
 * validation time rather than in the YAML editor.
 *
 * The API's `nested` entries are deliberately not supported. They are only
 * valid on fields mapped as `nested` in the source indices (in practice the
 * Endpoint objects enumerated in the exceptions docs), the step has no data
 * view to validate the mapping at authoring time, and a nested entry on a
 * non-nested field makes the generated exception filter fail the rule's
 * executions (the built `nested` query sets no `ignore_unmapped`). Endpoint
 * exceptions that need nested conditions can be managed via the UI or API.
 */
export const exceptionEntrySchema = z
  .object({
    field: z.string().min(1).max(1024),
    operator: exceptionEntryOperatorSchema,
    value: z.string().min(1).max(1024).optional(),
    values: z.array(z.string().min(1).max(1024)).min(1).optional(),
    list: z
      .object({
        id: z.string().min(1),
        type: ListType,
      })
      .optional(),
  })
  .superRefine((entry, ctx) => {
    const operandKey = OPERAND_KEY_BY_OPERATOR[entry.operator];

    for (const key of ['value', 'values', 'list'] as const) {
      if (key === operandKey && entry[key] === undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: i18n.translate(
            'xpack.securitySolution.workflows.steps.exceptionItem.entryOperandRequired',
            {
              defaultMessage: '`{operandKey}` is required for `{operator}` entries',
              values: { operandKey: key, operator: entry.operator },
            }
          ),
        });
      }
      if (key !== operandKey && entry[key] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: i18n.translate(
            'xpack.securitySolution.workflows.steps.exceptionItem.entryOperandNotAllowed',
            {
              defaultMessage: '`{operandKey}` is not allowed for `{operator}` entries',
              values: { operandKey: key, operator: entry.operator },
            }
          ),
        });
      }
    }
  });

/**
 * Fields shared by both exception-creation steps: everything describing the
 * exception item itself, independent of which list it is created in. All
 * entries of an item must match for the exception to apply (logical AND);
 * separate items in the same list are alternatives (logical OR).
 */
const LIST_OPERATORS: ReadonlyArray<z.infer<typeof exceptionEntryOperatorSchema>> = [
  'is_in_list',
  'is_not_in_list',
];

/**
 * Mirrors the API's `nonEmptyEntriesArray` constraint ("Cannot have entry of
 * type list and other" in kbn-securitysolution-io-ts-list-types
 * `non_empty_entries_array`): value-list conditions cannot be combined with
 * other condition types within one item. That constraint only exists in the
 * io-ts request schema (the generated Zod `ExceptionListItemEntryArray` does
 * not carry it), so it is re-expressed here for the step's flat entry shape,
 * giving workflow authors the error at validation time instead of a runtime
 * 400.
 */
const entriesArraySchema = z
  .array(exceptionEntrySchema)
  .min(1)
  .superRefine((entries, ctx) => {
    const hasListEntry = entries.some((entry) => LIST_OPERATORS.includes(entry.operator));
    const hasNonListEntry = entries.some((entry) => !LIST_OPERATORS.includes(entry.operator));
    if (hasListEntry && hasNonListEntry) {
      ctx.addIssue({
        code: 'custom',
        message: i18n.translate(
          'xpack.securitySolution.workflows.steps.exceptionItem.valueListEntryMixed',
          {
            defaultMessage:
              'Value-list conditions (`is_in_list` / `is_not_in_list`) cannot be combined with other conditions in the same exception item',
          }
        ),
      });
    }
  });

/**
 * Shared refine message for the `overwrite` inputs of both exception steps.
 */
export const OVERWRITE_REQUIRES_ITEM_ID_MESSAGE = i18n.translate(
  'xpack.securitySolution.workflows.steps.exceptionItem.overwriteRequiresItemId',
  { defaultMessage: '`overwrite` requires `item_id`' }
);

export const exceptionItemBaseSchema = z.object({
  name: ExceptionListItemName,
  description: ExceptionListItemDescription,
  entries: entriesArraySchema,
  os_types: ExceptionListItemOsTypeArray.optional(),
  tags: ExceptionListItemTags.optional(),
  // ISO 8601 datetime after which the exception no longer applies. Kept a
  // plain string so template expressions pass workflow validation; the
  // exceptions API enforces the format.
  expire_time: z.string().min(1).optional(),
  comments: z.array(z.string().min(1)).optional(),
});

/**
 * Summary of an exception item as returned by the exceptions APIs: the
 * identifying slice of the API's `ExceptionListItem`. Unlike the input
 * schemas, this can use the generated schemas verbatim (datetime formats
 * included) since outputs never contain template expressions.
 */
export const exceptionItemSummarySchema = ExceptionListItem.pick({
  id: true,
  item_id: true,
  list_id: true,
  namespace_type: true,
  name: true,
  created_at: true,
  created_by: true,
  expire_time: true,
});

/**
 * What the step did: created a new item, skipped because an item with the
 * given `item_id` already exists, or overwrote that existing item
 * (`overwrite: true`).
 */
export const exceptionItemOutcomeSchema = z.enum(['created', 'skipped', 'overwritten']);

export const exceptionItemOutputSchema = exceptionItemSummarySchema.extend({
  outcome: exceptionItemOutcomeSchema,
});

export type ExceptionEntryOperator = z.infer<typeof exceptionEntryOperatorSchema>;
export type ExceptionItemSummary = z.infer<typeof exceptionItemSummarySchema>;
export type ExceptionEntryInput = z.infer<typeof exceptionEntrySchema>;
export type ExceptionItemBaseInput = z.infer<typeof exceptionItemBaseSchema>;
export type ExceptionItemOutcome = z.infer<typeof exceptionItemOutcomeSchema>;
export type ExceptionItemOutput = z.infer<typeof exceptionItemOutputSchema>;
