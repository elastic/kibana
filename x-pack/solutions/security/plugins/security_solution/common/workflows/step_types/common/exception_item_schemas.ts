/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ExceptionListItem,
  ExceptionListItemDescription,
  ExceptionListItemName,
  ExceptionListItemOsTypeArray,
  ExceptionListItemTags,
} from '@kbn/securitysolution-exceptions-common/api';
import { ListType } from '@kbn/securitysolution-lists-common/api';

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
    field: z.string().min(1),
    operator: exceptionEntryOperatorSchema,
    value: z.string().min(1).optional(),
    values: z.array(z.string().min(1)).min(1).optional(),
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
          message: `\`${key}\` is required for \`${entry.operator}\` entries`,
        });
      }
      if (key !== operandKey && entry[key] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `\`${key}\` is not allowed for \`${entry.operator}\` entries`,
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
export const exceptionItemBaseSchema = z.object({
  name: ExceptionListItemName,
  description: ExceptionListItemDescription.optional(),
  entries: z.array(exceptionEntrySchema).min(1),
  os_types: ExceptionListItemOsTypeArray.optional(),
  tags: ExceptionListItemTags.optional(),
  // ISO 8601 datetime after which the exception no longer applies. Kept a
  // plain string so template expressions pass workflow validation; the
  // exceptions API enforces the format.
  expire_time: z.string().min(1).optional(),
  comments: z.array(z.string().min(1)).optional(),
});

/**
 * Summary of the created exception item returned as the step output: the
 * identifying slice of the API's `ExceptionListItem`. Unlike the input
 * schemas, this can use the generated schemas verbatim (datetime formats
 * included) since outputs never contain template expressions.
 */
export const exceptionItemOutputSchema = ExceptionListItem.pick({
  id: true,
  item_id: true,
  list_id: true,
  namespace_type: true,
  name: true,
  created_at: true,
  created_by: true,
  expire_time: true,
});

export type ExceptionEntryOperator = z.infer<typeof exceptionEntryOperatorSchema>;
export type ExceptionEntryInput = z.infer<typeof exceptionEntrySchema>;
export type ExceptionItemBaseInput = z.infer<typeof exceptionItemBaseSchema>;
export type ExceptionItemOutput = z.infer<typeof exceptionItemOutputSchema>;
