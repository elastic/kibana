/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  CreateExceptionListItemRequestBody,
  CreateExceptionListItemResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse } from './utils';
import { getExceptionListClient } from './utils/get_exception_list_client';
import { endpointDisallowedFields } from './endpoint_disallowed_fields';
import { validateEndpointExceptionItemEntries, validateExceptionListSize } from './validate';

export const createExceptionListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: EXCEPTION_LIST_ITEM_URL,
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
            body: buildRouteValidationWithZod(CreateExceptionListItemRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const {
            namespace_type: namespaceType,
            name,
            tags,
            meta,
            comments,
            description,
            entries,
            item_id: itemId = uuidv4(),
            list_id: listId,
            os_types: osTypes,
            type,
            expire_time: expireTime,
          } = request.body;
          const exceptionLists = await getExceptionListClient(context);
          const exceptionList = await exceptionLists.getExceptionList({
            id: undefined,
            listId,
            namespaceType,
          });

          if (exceptionList == null) {
            return siemResponse.error({
              body: `exception list id: "${listId}" does not exist`,
              statusCode: 404,
            });
          }

          const exceptionListItem = await exceptionLists.getExceptionListItem({
            id: undefined,
            itemId,
            namespaceType,
          });

          if (exceptionListItem != null) {
            return siemResponse.error({
              body: `exception list item id: "${itemId}" already exists`,
              statusCode: 409,
            });
          }

          if (exceptionList.type === 'endpoint') {
            const error = validateEndpointExceptionItemEntries(request.body.entries);
            if (error != null) {
              return siemResponse.error(error);
            }
            for (const entry of entries) {
              if (endpointDisallowedFields.includes(entry.field)) {
                return siemResponse.error({
                  body: `cannot add endpoint exception item on field ${entry.field}`,
                  statusCode: 400,
                });
              }
            }
          }

          const createdListItem = await exceptionLists.createExceptionListItem({
            comments,
            description,
            entries,
            expireTime,
            itemId,
            listId,
            meta,
            name,
            namespaceType,
            osTypes,
            tags,
            type,
          });

          const listSizeError = await validateExceptionListSize(
            exceptionLists,
            listId,
            namespaceType
          );

          if (listSizeError != null) {
            await exceptionLists.deleteExceptionListItemById({
              id: createdListItem.id,
              namespaceType,
            });
            return siemResponse.error(listSizeError);
          }

          return response.ok({
            body: CreateExceptionListItemResponse.parse(createdListItem),
          });
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
