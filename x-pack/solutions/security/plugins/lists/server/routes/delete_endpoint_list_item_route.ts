/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  DeleteEndpointListItemRequestQuery,
  DeleteEndpointListItemResponse,
} from '@kbn/securitysolution-endpoint-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import {
  buildSiemResponse,
  getErrorMessageExceptionListItem,
  getExceptionListClient,
} from './utils';

export const deleteEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .delete({
      access: 'public',
      path: ENDPOINT_LIST_ITEM_URL,
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
            query: buildRouteValidationWithZod(DeleteEndpointListItemRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const exceptionLists = await getExceptionListClient(context);
          const { item_id: itemId, id } = request.query;
          if (itemId == null && id == null) {
            return siemResponse.error({
              body: 'Either "item_id" or "id" needs to be defined in the request',
              statusCode: 400,
            });
          } else {
            const deleted = await exceptionLists.deleteEndpointListItem({
              id,
              itemId,
            });
            if (deleted == null) {
              return siemResponse.error({
                body: getErrorMessageExceptionListItem({ id, itemId }),
                statusCode: 404,
              });
            } else {
              return response.ok({ body: DeleteEndpointListItemResponse.parse(deleted) });
            }
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
