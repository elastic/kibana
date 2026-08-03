/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import type { ExceptionListItem } from '@kbn/securitysolution-exceptions-common/api';
import { createExceptionListItemStepCommonDefinition } from '../../../../common/workflows/step_types/create_exception_list_item_step/create_exception_list_item_step_common';
import {
  createExceptionItemInList,
  ExceptionItemStepAction,
  findExceptionItemByItemId,
  toExceptionItemOutput,
  updateExceptionItemByItemId,
} from '../../utils/exception_item';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

const ACTION = ExceptionItemStepAction.CreateExceptionListItem;

export const createExceptionListItemStepDefinition = createServerStepDefinition({
  ...createExceptionListItemStepCommonDefinition,
  handler: async (context) => {
    const {
      list_id: listId,
      namespace_type: namespaceType,
      item_id: itemId,
      overwrite,
      ...item
    } = context.input;

    try {
      let existingItem: ExceptionListItem | undefined;
      if (itemId !== undefined) {
        // `item_id` is not scoped to a particular list, so an item with this
        // `item_id` could belong to a different list than the one targeted.
        // Skipping or overwriting that item would silently act on the wrong
        // list, so a mismatch is a hard failure rather than a fall-through to
        // create (which would 409 anyway, since the exception-list-items API
        // does enforce item_id uniqueness, but with a less specific message).
        const candidate = await findExceptionItemByItemId(
          context.contextManager,
          ACTION,
          itemId,
          namespaceType
        );
        if (candidate !== undefined) {
          if (candidate.list_id === listId) {
            existingItem = candidate;
          } else {
            throw new ExecutionError({
              type: 'ConflictError',
              message:
                `Failed to ${ACTION}: item_id "${itemId}" already exists on a different ` +
                `exception list (list_id: "${candidate.list_id}"), not the target list ` +
                `(list_id: "${listId}"). Choose a different item_id, or manage that item directly.`,
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
          namespaceType,
          item
        );
        return toExceptionItemOutput(updated, 'overwritten');
      }

      const created = await createExceptionItemInList(
        context.contextManager,
        ACTION,
        listId,
        namespaceType,
        itemId,
        item
      );

      return toExceptionItemOutput(created, 'created');
    } catch (error) {
      throw toApiExecutionError(error, ACTION);
    }
  },
});
