/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_ITEM_URL_BULK } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { isEmpty } from 'lodash';
import {
  BulkDeleteListItemsRequestQuery,
  BulkDeleteListItemsResponse,
} from '@kbn/securitysolution-lists-common/api';

import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const deleteListItemsRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .delete({
      access: 'public',
      path: LIST_ITEM_URL_BULK,
      security: {
        authz: {
          requiredPrivileges: ['lists-all'],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(BulkDeleteListItemsRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { ids, list_id: listId, value, refresh } = request.query;
          const shouldRefresh = refresh === 'true' ? true : false;
          const lists = await getListClient(context);
          // null check required to satisfy type checker
          if (!isEmpty(ids) && ids != null) {
            const deleted = await lists.deleteListItems({ ids, refresh: shouldRefresh });
            if (deleted == null) {
              return siemResponse.error({
                body: `list item with id: "${ids}" not found`,
                statusCode: 404,
              });
            }

            return response.ok({ body: BulkDeleteListItemsResponse.parse(deleted) });
          } else if (listId != null && value != null) {
            const list = await lists.getList({ id: listId });

            if (list == null) {
              return siemResponse.error({
                body: `list_id: "${listId}" does not exist`,
                statusCode: 404,
              });
            }

            const deleted = await lists.deleteListItemByValue({
              listId,
              refresh: shouldRefresh,
              type: list.type,
              value,
            });

            if (deleted == null || deleted.length === 0) {
              return siemResponse.error({
                body: `list_id: "${listId}" with ${value} was not found`,
                statusCode: 404,
              });
            }

            return response.ok({ body: BulkDeleteListItemsResponse.parse(deleted) });
          } else {
            return siemResponse.error({
              body: 'Either "list_id" or "ids" needs to be defined in the request',
              statusCode: 400,
            });
          }
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
