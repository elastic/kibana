/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { ENDPOINT_LIST_ID, ENDPOINT_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  FindEndpointListItemsRequestQuery,
  FindEndpointListItemsResponse,
} from '@kbn/securitysolution-endpoint-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const findEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      path: `${ENDPOINT_LIST_ITEM_URL}/_find`,
      security: {
        authz: {
          requiredPrivileges: ['lists-read'],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidationWithZod(FindEndpointListItemsRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const exceptionLists = await getExceptionListClient(context);
          const {
            filter,
            page,
            per_page: perPage,
            sort_field: sortField,
            sort_order: sortOrder,
          } = request.query;

          const exceptionListItems = await exceptionLists.findEndpointListItem({
            filter,
            page,
            perPage,
            pit: undefined,
            searchAfter: undefined,
            sortField,
            sortOrder,
          });
          if (exceptionListItems == null) {
            // Although I have this line of code here, this is an incredibly rare thing to have
            // happen as the findEndpointListItem tries to auto-create the endpoint list if
            // does not exist.
            return siemResponse.error({
              body: `list id: "${ENDPOINT_LIST_ID}" does not exist`,
              statusCode: 404,
            });
          }

          return response.ok({ body: FindEndpointListItemsResponse.parse(exceptionListItems) });
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
