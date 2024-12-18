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
  UpdateEndpointListItemRequestBody,
  UpdateEndpointListItemResponse,
} from '@kbn/securitysolution-endpoint-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse } from './utils';

import { getExceptionListClient } from '.';

export const updateEndpointListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .put({
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
            body: buildRouteValidationWithZod(UpdateEndpointListItemRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const {
            description,
            id,
            name,
            os_types: osTypes,
            meta,
            type,
            _version,
            comments,
            entries,
            item_id: itemId,
            tags,
          } = request.body;
          const exceptionLists = await getExceptionListClient(context);
          const exceptionListItem = await exceptionLists.updateEndpointListItem({
            _version,
            comments,
            description,
            entries,
            id,
            itemId,
            meta,
            name,
            osTypes,
            tags,
            type,
          });
          if (exceptionListItem == null) {
            if (id != null) {
              return siemResponse.error({
                body: `list item id: "${id}" not found`,
                statusCode: 404,
              });
            } else {
              return siemResponse.error({
                body: `list item item_id: "${itemId}" not found`,
                statusCode: 404,
              });
            }
          } else {
            return response.ok({ body: UpdateEndpointListItemResponse.parse(exceptionListItem) });
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
