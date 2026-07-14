/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { EXCEPTION_LIST_BULK_DELETE_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import {
  BulkDeleteExceptionListsRequestBody,
  BulkDeleteExceptionListsResponse,
} from '@kbn/securitysolution-exceptions-common/api';
import { EXCEPTIONS_API_ALL } from '@kbn/security-solution-features/constants';

import type { ListsPluginRouter } from '../types';

import { buildSiemResponse, getExceptionListClient } from './utils';

export const MAX_BULK_DELETE_EXCEPTION_LISTS = 100;

// Worst-case wall-clock budget: MAX_BULK_DELETE_EXCEPTION_LISTS lists each with
// MAX_EXCEPTION_LIST_SIZE (10,000) items, processed at BULK_DELETE_LIST_CONCURRENCY=3,
// each list taking N page-delete round-trips (1,000 items/page) → ~300 sequential
// ES round-trips per slot × 3 slots = up to ~300 total sequential ES calls, each
// ~10–50ms, so worst-case ~3–15s in a healthy cluster.  Under network stress or a
// slow ES cluster this can approach or exceed common proxy/load-balancer timeout
// ceilings (typically 60–120s).  If that becomes a real problem the fix is a
// background-job pattern (fire-and-forget + status poll), not a larger timeout.

export const bulkDeleteExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'public',
      path: EXCEPTION_LIST_BULK_DELETE_URL,
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
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { ids = [], list_ids: listIds = [], namespace_type: namespaceType } = request.body;

          if (ids.length > 0 && listIds.length > 0) {
            return siemResponse.error({
              body: 'Only one of "ids" or "list_ids" can be provided, not both',
              statusCode: 400,
            });
          }

          if (ids.length === 0 && listIds.length === 0) {
            return siemResponse.error({
              body: 'Either "ids" or "list_ids" must contain at least one entry',
              statusCode: 400,
            });
          }

          if (ids.length + listIds.length > MAX_BULK_DELETE_EXCEPTION_LISTS) {
            return siemResponse.error({
              body: `Number of lists to delete exceeds the maximum of ${MAX_BULK_DELETE_EXCEPTION_LISTS}`,
              statusCode: 400,
            });
          }

          const exceptionLists = await getExceptionListClient(context);
          const result = await exceptionLists.bulkDeleteExceptionList({
            ids,
            listIds,
            namespaceType,
          });

          return response.ok({ body: BulkDeleteExceptionListsResponse.parse(result) });
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
