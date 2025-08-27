/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ExportExceptionListRequestQuery } from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const exportExceptionsRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: `${EXCEPTION_LIST_URL}/_export`,
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
            query: buildRouteValidationWithZod(ExportExceptionListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        console.error('HERE 1');
        const siemResponse = buildSiemResponse(response);

        try {
          console.error('HERE 2');

          const {
            id,
            list_id: listId,
            namespace_type: namespaceType,
            include_expired_exceptions: includeExpiredExceptionsString,
          } = request.query;
          const exceptionListsClient = await getExceptionListClient(context);
          console.error(`HERE 3 ${id} && ${listId}`);

          // Defaults to including expired exceptions if query param is not present
          const includeExpiredExceptions =
            includeExpiredExceptionsString !== undefined
              ? includeExpiredExceptionsString === 'true'
              : true;
          const exportContent = await exceptionListsClient.exportExceptionListAndItems({
            id,
            includeExpiredExceptions,
            listId,
            namespaceType,
          });
          console.error('HERE 4');

          if (exportContent == null) {
            console.error('HERE 5');

            return siemResponse.error({
              body: `exception list with list_id: ${listId} or id: ${id} does not exist`,
              statusCode: 400,
            });
          }
          console.error('HERE 6');

          return response.ok({
            body: `${exportContent.exportData}${JSON.stringify(exportContent.exportDetails)}\n`,
            headers: {
              'Content-Disposition': `attachment; filename="${listId}"`,
              'Content-Type': 'application/ndjson',
            },
          });
        } catch (err) {
          console.error('HERE 7', err);

          const error = transformError(err);
          return siemResponse.error({
            body: error.message,
            statusCode: error.statusCode,
          });
        }
      }
    );
};
