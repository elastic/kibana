/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  InternalCreateExceptionListSchemaDecoded,
  internalCreateExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL } from '@kbn/securitysolution-list-constants';

import { createExceptionListHandler } from '../../handlers/create_exception_list_handler';
import type { ListsPluginRouter } from '../../types';
import { buildRouteValidation, buildSiemResponse } from '../utils';

export const internalCreateExceptionListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .post({
      access: 'internal',
      path: INTERNAL_EXCEPTIONS_LIST_ENSURE_CREATED_URL,
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
            body: buildRouteValidation<
              typeof internalCreateExceptionListSchema,
              InternalCreateExceptionListSchemaDecoded
            >(internalCreateExceptionListSchema),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          return await createExceptionListHandler(context, request, response, siemResponse, {
            ignoreExisting: true,
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
