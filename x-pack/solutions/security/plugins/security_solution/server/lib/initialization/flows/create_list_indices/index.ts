/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import {
  INITIALIZATION_FLOW_CREATE_LIST_INDICES,
  INITIALIZATION_FLOW_STATUS_READY,
} from '../../../../../common/api/initialization';
import type { InitializationFlowContext, InitializationFlowDefinition } from '../../types';
import type { CreateListIndicesInitializationFlowContext } from './types';
import { FlowInitializationError } from '../../flow_registry';

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

export const createListIndicesInitializationFlow: InitializationFlowDefinition<CreateListIndicesInitializationFlowContext> =
  {
    id: INITIALIZATION_FLOW_CREATE_LIST_INDICES,
    resolveProvisionContext: async (
      initializationContext: InitializationFlowContext
    ): Promise<CreateListIndicesInitializationFlowContext> => {
      const listsContext = await initializationContext.requestHandlerContext.lists;

      if (!listsContext) {
        throw new FlowInitializationError('lists plugin is not available');
      }

      return {
        internalListClient: listsContext.getInternalListClient(),
      };
    },
    provision: async (
      { internalListClient }: CreateListIndicesInitializationFlowContext,
      logger: Logger
    ) => {
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

      logger.info('List indices initialized successfully');
      return { status: INITIALIZATION_FLOW_STATUS_READY, payload: null };
    },
  };
