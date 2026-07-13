/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  ExceptionListHumanId,
  ExceptionListItemHumanId,
  ExceptionNamespaceType,
} from '@kbn/securitysolution-exceptions-common/api';
import { StepCategory } from '@kbn/workflows';
import type { BaseStepDefinition } from '@kbn/workflows';
import { i18n } from '@kbn/i18n';
import {
  exceptionItemBaseSchema,
  exceptionItemOutputSchema,
} from '../common/exception_item_schemas';

export const CreateExceptionListItemStepId = 'security.createExceptionListItem' as const;

export const createExceptionListItemInputSchema = z.object({
  list_id: ExceptionListHumanId,
  namespace_type: ExceptionNamespaceType.optional().default('single'),
  item_id: ExceptionListItemHumanId.optional(),
  ...exceptionItemBaseSchema.shape,
});

export const createExceptionListItemOutputSchema = exceptionItemOutputSchema;

export const createExceptionListItemStepCommonDefinition: BaseStepDefinition<
  typeof createExceptionListItemInputSchema,
  typeof createExceptionListItemOutputSchema
> = {
  id: CreateExceptionListItemStepId,
  label: i18n.translate('xpack.securitySolution.workflows.steps.createExceptionListItem.label', {
    defaultMessage: 'Create Exception List Item',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.steps.createExceptionListItem.description',
    {
      defaultMessage:
        "Add an exception item to an existing exception list, identified by its `list_id`. Adding to a shared exception list affects every rule the list is linked to. Those rules stop generating alerts for events that match all of the item's `entries`.",
    }
  ),
  category: StepCategory.KibanaSecurity,
  inputSchema: createExceptionListItemInputSchema,
  outputSchema: createExceptionListItemOutputSchema,
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.steps.createExceptionListItem.documentation.details',
      {
        defaultMessage:
          "Creates an exception item in the list identified by `list_id` and `namespace_type` (`single` for the current space, `agnostic` for space-agnostic lists; defaults to `single`). Fails if the list does not exist. All `entries` of the item must match for the exception to apply; create separate items for alternative conditions. Each entry combines a `field` with an `operator`: `is`, `is_not`, `matches` and `does_not_match` take a single `value` (the match operators support `*` and `?` wildcards), `is_one_of` and `is_not_one_of` take a `values` array, `exists` and `does_not_exist` take no operand, and `is_in_list` and `is_not_in_list` reference a value list via `list.id` and `list.type`. Nested conditions (for fields mapped as nested in Elasticsearch) are not supported; manage those exceptions in the Security UI. An optional `expire_time` (ISO 8601) makes the exception temporary, and an optional `item_id` gives the item a stable human-readable identifier. To add an exception to a single rule's own list instead, use the create rule exception step.",
      }
    ),
    examples: [
      `## Add an item to a shared exception list
\`\`\`yaml
- name: add_exception_to_shared_list
  type: security.createExceptionListItem
  with:
    list_id: corporate-allowlist
    name: "Allow scanner IP"
    description: "Vulnerability scanner traffic"
    entries:
      - field: source.ip
        operator: is
        value: "{{ event.source.ip }}"
\`\`\``,
      `## Item referencing a value list, in a space-agnostic list
\`\`\`yaml
- name: add_value_list_exception
  type: security.createExceptionListItem
  with:
    list_id: corporate-allowlist
    namespace_type: agnostic
    name: "Allow approved scanner IPs"
    entries:
      - field: source.ip
        operator: is_in_list
        list:
          id: approved_scanner_ips
          type: ip
\`\`\``,
    ],
  },
};
