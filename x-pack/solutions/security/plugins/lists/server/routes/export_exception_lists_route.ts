/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ExportExceptionListsRequestQuery } from '@kbn/securitysolution-exceptions-common/api';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const exportExceptionListsRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: `${EXCEPTION_LIST_URL}/_bulk_export`,
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
            query: buildRouteValidationWithZod(ExportExceptionListsRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const {
            filter,
            include_expired_exceptions: includeExpiredExceptionsString,
            namespace_type: namespaceType,
          } = request.query;
          const exceptionListsClient = await getExceptionListClient(context);

          // Defaults to including expired exceptions if query param is not present
          const includeExpiredExceptions = (includeExpiredExceptionsString ?? 'true') === 'true';

          const exportContent = await exceptionListsClient.exportExceptionListsAndItems({
            filter,
            includeExpiredExceptions,
            namespaceType,
          });

          if (exportContent == null) {
            return siemResponse.error({
              body: `No lists found for filter: "${filter}"`,
              statusCode: 404,
            });
          }

          return response.ok({
            body: `${exportContent.exportData}${JSON.stringify(exportContent.exportDetails)}\n`,
            headers: {
              'Content-Disposition': `attachment; filename="TODOAllExceptionListsMaybeAddTimestampHere.ndjson"`,
              'Content-Type': 'application/ndjson',
            },
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
