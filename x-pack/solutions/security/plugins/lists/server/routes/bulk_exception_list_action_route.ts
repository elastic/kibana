/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_BULK_ACTION_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  BulkDeleteExceptionListsRequestBody,
  BulkDeleteExceptionListsResponse,
} from '@kbn/securitysolution-exceptions-common/api';
import { EXCEPTIONS_API_ALL } from '@kbn/security-solution-features/constants';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const bulkExceptionListActionRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'internal',
      path: EXCEPTION_LIST_BULK_ACTION_URL,
      security: {
        authz: {
          requiredPrivileges: [EXCEPTIONS_API_ALL],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidationWithZod(BulkDeleteExceptionListsRequestBody),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { action, ids, namespace_type: namespaceType } = request.body;
          const exceptionLists = await getExceptionListClient(context);

          switch (action) {
            case 'delete': {
              const result = await exceptionLists.bulkDeleteExceptionList({
                ids,
                namespaceType,
              });
              return response.ok({ body: BulkDeleteExceptionListsResponse.parse(result) });
            }
            default: {
              const unsupported: never = action;
              return siemResponse.error({
                body: `Unsupported action: "${String(unsupported)}"`,
                statusCode: 400,
              });
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
