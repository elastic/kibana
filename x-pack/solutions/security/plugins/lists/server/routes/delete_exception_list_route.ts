/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  DeleteExceptionListRequestQuery,
  DeleteExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getErrorMessageExceptionList, getExceptionListClient } from './utils';

export const deleteExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .delete({
      access: 'public',
      path: EXCEPTION_LIST_URL,
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
            query: buildRouteValidationWithZod(DeleteExceptionListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const exceptionLists = await getExceptionListClient(context);
          const { list_id: listId, id, namespace_type: namespaceType } = request.query;

          if (listId == null && id == null) {
            return siemResponse.error({
              body: 'Either "list_id" or "id" needs to be defined in the request',
              statusCode: 400,
            });
          }

          const deleted = await exceptionLists.deleteExceptionList({
            id,
            listId,
            namespaceType,
          });

          if (deleted == null) {
            return siemResponse.error({
              body: getErrorMessageExceptionList({ id, listId }),
              statusCode: 404,
            });
          }

          return response.ok({ body: DeleteExceptionListResponse.parse(deleted) });
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
