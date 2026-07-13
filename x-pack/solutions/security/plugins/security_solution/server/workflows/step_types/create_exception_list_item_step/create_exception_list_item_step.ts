/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import type { ExceptionListItemSchema } from '@kbn/securitysolution-io-ts-list-types';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createExceptionListItemStepCommonDefinition } from '../../../../common/workflows/step_types/create_exception_list_item_step/create_exception_list_item_step_common';
import { toCreateExceptionItemBody, toExceptionItemOutput } from '../../utils/exception_item';
import { toApiExecutionError } from '../../utils/to_api_execution_error';

export const createExceptionListItemStepDefinition = createServerStepDefinition({
  ...createExceptionListItemStepCommonDefinition,
  handler: async (context) => {
    const {
      list_id: listId,
      namespace_type: namespaceType,
      item_id: itemId,
      ...item
    } = context.input;

    try {
      const { body } = await context.contextManager.callKibanaApi<ExceptionListItemSchema>({
        method: 'POST',
        path: EXCEPTION_LIST_ITEM_URL,
        body: {
          list_id: listId,
          namespace_type: namespaceType,
          ...(itemId !== undefined ? { item_id: itemId } : {}),
          ...toCreateExceptionItemBody(item),
        },
      });

      return toExceptionItemOutput(body, 'create exception list item');
    } catch (error) {
      throw toApiExecutionError(error, 'create exception list item');
    }
  },
});
