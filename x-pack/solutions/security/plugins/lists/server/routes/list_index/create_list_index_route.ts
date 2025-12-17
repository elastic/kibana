/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_INDEX } from '@kbn/securitysolution-list-constants';
import {
  type CreateListIndexResponse,
  CreateListIndexResponse as ResponseSchema,
} from '@kbn/securitysolution-lists-common/api';
import { LISTS_API_ALL } from '@kbn/security-solution-features/constants';

import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getInternalListClient } from '..';

const getAcknowledgedResponse = (): { body: CreateListIndexResponse } => ({
  body: ResponseSchema.parse({ acknowledged: true }),
});

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

export const createListIndexRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: LIST_INDEX,
      security: {
        authz: {
          requiredPrivileges: [LISTS_API_ALL],
        },
      },
    })
    .addVersion({ validate: false, version: '2023-10-31' }, async (context, _, response) => {
      const siemResponse = buildSiemResponse(response);

      try {
        const lists = await getInternalListClient(context);

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
          return response.ok(getAcknowledgedResponse());
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

        return response.ok(getAcknowledgedResponse());
      } catch (err) {
        const error = transformError(err);
        return siemResponse.error({
          body: error.message,
          statusCode: error.statusCode,
        });
      }
    });
};
