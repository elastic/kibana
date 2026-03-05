/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InitializationFlowDefinition } from '../types';

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

export const createListIndicesInitializationFlow: InitializationFlowDefinition = {
  id: 'create-list-indices',
  provision: async ({ requestHandlerContext, logger }) => {
    const listsContext = await requestHandlerContext.lists;

    if (!listsContext) {
      return { status: 'error', error: 'Lists plugin is not available' };
    }

    const lists = listsContext.getInternalListClient();

    const listDataStreamExists = await lists.getListDataStreamExists();
    const listItemDataStreamExists = await lists.getListItemDataStreamExists();

    const templateListExists = await lists.getListTemplateExists();
    const templateListItemsExists = await lists.getListItemTemplateExists();

    if (!templateListExists || !listDataStreamExists) {
      await lists.setListTemplate();
    }

    if (!templateListItemsExists || !listItemDataStreamExists) {
      await lists.setListItemTemplate();
    }

    if (listDataStreamExists && listItemDataStreamExists) {
      return { status: 'ready' };
    }

    if (!listDataStreamExists) {
      await ignoreResourceAlreadyExistsError(async () => {
        const listIndexExists = await lists.getListIndexExists();
        await (listIndexExists
          ? lists.migrateListIndexToDataStream()
          : lists.createListDataStream());
      });
    }

    if (!listItemDataStreamExists) {
      await ignoreResourceAlreadyExistsError(async () => {
        const listItemIndexExists = await lists.getListItemIndexExists();
        await (listItemIndexExists
          ? lists.migrateListItemIndexToDataStream()
          : lists.createListItemDataStream());
      });
    }

    logger.info('List indices initialized successfully');
    return { status: 'ready' };
  },
};
