/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type {
  InitializationFlowContext,
  InitializationFlowDefinition,
  InitializationFlowResult,
} from '../../types';

const ignoreResourceAlreadyExistsError = async (runFn: () => Promise<void>): Promise<void> => {
  try {
    await runFn();
  } catch (err) {
    const isResourceAlreadyExistError =
      typeof err?.message === 'string' && err.message.includes('resource_already_exists_exception');
    if (!isResourceAlreadyExistError) {
      throw err;
    }
  }
};

export const createListIndicesInitializationFlow: InitializationFlowDefinition<null> = {
  id: INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  spaceAware: true,
  runFlow: async (context: InitializationFlowContext): Promise<InitializationFlowResult<null>> => {
    const listsContext = await context.requestHandlerContext.lists;

    if (!listsContext) {
      throw new Error('lists plugin is not available');
    }

    const internalListClient = listsContext.getInternalListClient();

    const listDataStreamExists = await internalListClient.getListDataStreamExists();
    const listItemDataStreamExists = await internalListClient.getListItemDataStreamExists();

    const templateListExists = await internalListClient.getListTemplateExists();
    const templateListItemsExists = await internalListClient.getListItemTemplateExists();

    if (!templateListExists || !listDataStreamExists) {
      await internalListClient.setListTemplate();
    }

    if (!templateListItemsExists || !listItemDataStreamExists) {
      await internalListClient.setListItemTemplate();
    }

    if (listDataStreamExists && listItemDataStreamExists) {
      return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
    }

    if (!listDataStreamExists) {
      await ignoreResourceAlreadyExistsError(async () => {
        const listIndexExists = await internalListClient.getListIndexExists();
        await (listIndexExists
          ? internalListClient.migrateListIndexToDataStream()
          : internalListClient.createListDataStream());
      });
    }

    if (!listItemDataStreamExists) {
      await ignoreResourceAlreadyExistsError(async () => {
        const listItemIndexExists = await internalListClient.getListItemIndexExists();
        await (listItemIndexExists
          ? internalListClient.migrateListItemIndexToDataStream()
          : internalListClient.createListItemDataStream());
      });
    }

    context.logger.info('List indices initialized successfully');
    return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
  },
};
