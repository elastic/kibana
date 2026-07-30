/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { ExceptionListItem } from '@kbn/securitysolution-exceptions-common/api';
import { createRuleExceptionStepCommonDefinition } from '../../../../common/workflows/step_types/create_rule_exception_step/create_rule_exception_step_common';
import {
  createExceptionItemForRule,
  ExceptionItemStepAction,
  findExceptionItemByItemId,
  findRuleDefaultExceptionListId,
  toExceptionItemOutput,
  updateExceptionItemByItemId,
} from '../../utils/exception_item';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

const ACTION = ExceptionItemStepAction.CreateRuleException;

// Rule default exception lists are always space-specific: `createExceptionList`
// in ../../../lib/detection_engine/rule_exceptions/api/create_rule_exceptions/route.ts
// (the only path creating `rule_default` lists) hardcodes `namespace_type: 'single'`.
const RULE_DEFAULT_LIST_NAMESPACE = 'single' as const;

export const createRuleExceptionStepDefinition = createServerStepDefinition({
  ...createRuleExceptionStepCommonDefinition,
  handler: async (context) => {
    const { rule_id: ruleId, item_id: itemId, overwrite, ...item } = context.input;

    try {
      let existingItem: ExceptionListItem | undefined;
      if (itemId !== undefined) {
        // `item_id` is not scoped to a particular list, so an item with this
        // `item_id` could belong to an unrelated (possibly shared) list.
        // Skipping or overwriting that item would violate the step's "only
        // affects that rule" guarantee; creating a new item alongside it
        // would silently duplicate the item_id, since the rule-exceptions
        // creation endpoint has no uniqueness check of its own (and every
        // later run would hit the same foreign item and duplicate again).
        // So a mismatch is a hard failure, not a fall-through to create.
        const candidate = await findExceptionItemByItemId(
          context.contextManager,
          ACTION,
          itemId,
          RULE_DEFAULT_LIST_NAMESPACE
        );
        if (candidate !== undefined) {
          const ruleDefaultListId = await findRuleDefaultExceptionListId(
            context.contextManager,
            ACTION,
            ruleId
          );
          if (candidate.list_id === ruleDefaultListId) {
            existingItem = candidate;
          } else {
            throw new ExecutionError({
              type: 'ConflictError',
              message:
                `Failed to ${ACTION}: item_id "${itemId}" already exists on a different ` +
                `exception list (list_id: "${candidate.list_id}"), not this rule's own ${
                  ruleDefaultListId !== undefined
                    ? `default list (list_id: "${ruleDefaultListId}").`
                    : `default list (the rule has none yet).`
                } Choose a different item_id, or manage that item directly.`,
            });
          }
        }
      }

      if (existingItem && !overwrite) {
        return toExceptionItemOutput(existingItem, 'skipped');
      }

      if (existingItem) {
        const updated = await updateExceptionItemByItemId(
          context.contextManager,
          ACTION,
          existingItem.item_id,
          RULE_DEFAULT_LIST_NAMESPACE,
          item
        );
        return toExceptionItemOutput(updated, 'overwritten');
      }

      const created = await createExceptionItemForRule(
        context.contextManager,
        ACTION,
        ruleId,
        itemId,
        item
      );
      return toExceptionItemOutput(created, 'created');
    } catch (error) {
      throw toApiExecutionError(error, ACTION);
    }
  },
});
