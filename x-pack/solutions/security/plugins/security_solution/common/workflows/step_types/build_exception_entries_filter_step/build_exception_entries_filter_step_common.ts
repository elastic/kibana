/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import { exceptionEntrySchema } from '@kbn/securitysolution-exceptions-common/workflows';

export const BuildExceptionEntriesFilterStepId = 'security.buildExceptionEntriesFilter' as const;

const UNSUPPORTED_OPERATORS: readonly string[] = ['is_in_list', 'is_not_in_list'];

// Reuses the flat entry shape the exception-creation steps take (not a z.union:
// unions in step input schemas break workflow validation for template-string
// inputs, see bulk_action_schemas.ts). Value-list operators are rejected: this
// step builds the filter itself and cannot resolve a value list.
export const buildExceptionEntriesFilterInputSchema = z.object({
  entries: z
    .array(exceptionEntrySchema)
    .min(1)
    .max(100)
    .superRefine((entries, ctx) => {
      entries.forEach((entry, index) => {
        if (UNSUPPORTED_OPERATORS.includes(entry.operator)) {
          ctx.addIssue({
            code: 'custom',
            path: [index, 'operator'],
            message: i18n.translate(
              'xpack.securitySolution.workflows.steps.buildExceptionEntriesFilter.listOperatorUnsupported',
              {
                defaultMessage:
                  'Value-list conditions (`is_in_list` / `is_not_in_list`) are not supported when building an exception filter',
              }
            ),
          });
        }
      });
    })
    .describe('Proposed exception entries, ANDed together as one exception item would be'),
  existing_filters: z
    .array(z.record(z.string(), z.unknown()))
    .default([])
    .describe("The rule's own current filters, to preserve alongside the new one"),
});

export const buildExceptionEntriesFilterOutputSchema = z.object({
  filters: z
    .array(z.record(z.string(), z.unknown()))
    .describe(
      "existing_filters plus one filter excluding alerts the proposed exception would suppress — use in place of the rule's own filters when previewing the exception"
    ),
});

export const buildExceptionEntriesFilterStepCommonDefinition: BaseStepDefinition<
  typeof buildExceptionEntriesFilterInputSchema,
  typeof buildExceptionEntriesFilterOutputSchema
> = {
  id: BuildExceptionEntriesFilterStepId,
  label: i18n.translate(
    'xpack.securitySolution.workflows.steps.buildExceptionEntriesFilter.label',
    {
      defaultMessage: 'Build Exception Entries Filter',
    }
  ),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.buildExceptionEntriesFilter.description',
    {
      defaultMessage:
        "Converts proposed exception entries into a filters array — the rule's own filters plus one excluding alerts the exception would suppress — without creating the exception itself.",
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: buildExceptionEntriesFilterInputSchema,
  outputSchema: buildExceptionEntriesFilterOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.buildExceptionEntriesFilter.documentation.details',
      {
        defaultMessage:
          "Builds the same match/match_any/wildcard/exists Elasticsearch clauses the exceptions system itself uses, one per entry, ANDed together (all entries must match, matching how a single exception item is evaluated), then negates the whole thing and appends it to existing_filters. Pass the output as a rule preview body's `filters` to see what the rule would produce with the proposed exception applied, without creating the exception itself.",
      }
    ),
    examples: [
      `## Build a preview-ready filters array from a proposed exception
\`\`\`yaml
- name: build_exception_filter
  type: security.buildExceptionEntriesFilter
  with:
    existing_filters: "\${{ steps.fetch_rule.output.filters | default: [] }}"
    entries:
      - field: host.name
        operator: is
        value: "admin-workstation-04"
\`\`\``,
    ],
  },
};
