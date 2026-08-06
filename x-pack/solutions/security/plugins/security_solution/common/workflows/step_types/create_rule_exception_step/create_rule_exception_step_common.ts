/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ExceptionListItemHumanId } from '@kbn/securitysolution-exceptions-common/api';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  exceptionItemBaseSchema,
  exceptionItemOutputSchema,
  OVERWRITE_REQUIRES_ITEM_ID_MESSAGE,
} from '../exceptions/common/exception_item_schemas';

export const CreateRuleExceptionStepId = 'security.createRuleException' as const;

export const createRuleExceptionInputSchema = z
  .object({
    rule_id: z.string().min(1),
    item_id: ExceptionListItemHumanId.optional(),
    overwrite: z.boolean().optional().default(false),
    ...exceptionItemBaseSchema.shape,
  })
  .superRefine((input, ctx) => {
    if (input.overwrite && input.item_id === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['overwrite'],
        message: OVERWRITE_REQUIRES_ITEM_ID_MESSAGE,
      });
    }
  });

export const createRuleExceptionOutputSchema = exceptionItemOutputSchema;

export const createRuleExceptionStepCommonDefinition: BaseStepDefinition<
  typeof createRuleExceptionInputSchema,
  typeof createRuleExceptionOutputSchema
> = {
  id: CreateRuleExceptionStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.createRuleException.label', {
    defaultMessage: 'Create Rule Exception',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.createRuleException.description',
    {
      defaultMessage:
        "Add an exception to a detection rule. The exception is created in the rule's own default exception list (created automatically if the rule does not have one yet) and only affects that rule. The rule stops generating alerts for events that match all of the item's `entries`.",
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: createRuleExceptionInputSchema,
  outputSchema: createRuleExceptionOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.createRuleException.documentation.details',
      {
        defaultMessage:
          "Creates an exception item on the rule identified by `rule_id` (the rule's UUID, e.g. `kibana.alert.rule.uuid` on an alert). All `entries` of the item must match for the exception to apply; create separate items for alternative conditions. Each entry combines a `field` with an `operator`: `is`, `is_not`, `matches` and `does_not_match` take a single `value` (the match operators support `*` and `?` wildcards), `is_one_of` and `is_not_one_of` take a `values` array, `exists` and `does_not_exist` take no operand, and `is_in_list` and `is_not_in_list` reference a value list via `list.id` and `list.type` (a value-list condition cannot be combined with other conditions in the same item). Nested conditions (for fields mapped as nested in Elasticsearch) are not supported; manage those exceptions in the Security UI. An optional `expire_time` (ISO 8601) makes the exception temporary. An optional `item_id` gives the item a stable identifier and makes the step idempotent within this rule's own exception list: when an item with that `item_id` already exists on the rule's default list, the step skips creation and returns the existing item, or updates it when `overwrite: true` (existing comments are preserved). Since `item_id` is not unique across lists, the step fails instead of touching an unrelated item elsewhere with the same `item_id`; pick a different `item_id` in that case. The output's `outcome` reports what happened: `created`, `skipped` or `overwritten`. To add items to a shared exception list instead, use the create exception list item step.",
      }
    ),
    examples: [
      `## Exclude a host from a rule
\`\`\`yaml
- name: add_exception_to_rule
  type: security.createRuleException
  with:
    rule_id: "{{ variables.rule_id }}"
    name: "Exclude maintenance host"
    description: "Host is under maintenance"
    entries:
      - field: host.name
        operator: is
        value: "{{ variables.host_name }}"
\`\`\``,
      `## Temporary exception created from an alert
\`\`\`yaml
- name: add_exception_from_alert
  type: security.createRuleException
  with:
    rule_id: "{{ event.kibana.alert.rule.uuid }}"
    name: "Auto exception for {{ event.host.name }}"
    description: "Created by workflow"
    expire_time: "{{ variables.expiration }}"
    comments:
      - "Excluded during the patching window"
    entries:
      - field: host.name
        operator: is
        value: "{{ event.host.name }}"
      - field: user.name
        operator: is_one_of
        values:
          - svc-patching
          - svc-backup
\`\`\``,
    ],
  },
};
