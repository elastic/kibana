/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { IKibanaResponse } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { ExceptionList } from '@kbn/securitysolution-exceptions-common/api';
import {
  CreateSharedExceptionListRequestBody,
  CreateSharedExceptionListResponse,
} from '@kbn/securitysolution-exceptions-common/api';

import { SHARED_EXCEPTION_LIST_URL } from '../../../../../common/constants';
import type { SecuritySolutionPluginRouter } from '../../../../types';
import { buildSiemResponse } from '../../../detection_engine/routes/utils';

export const createSharedExceptionListRoute = (router: SecuritySolutionPluginRouter) => {
  router.versioned
    .post({
      path: SHARED_EXCEPTION_LIST_URL,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: buildRouteValidationWithZod(CreateSharedExceptionListRequestBody),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<ExceptionList>> => {
        const siemResponse = buildSiemResponse(response);
        const { description, name } = request.body;

        try {
          const ctx = await context.resolve([
            'core',
            'securitySolution',
            'alerting',
            'licensing',
            'lists',
          ]);
          const listsClient = ctx.securitySolution.getExceptionListClient();
          const createdSharedList = await listsClient?.createExceptionList({
            description,
            immutable: false,
            listId: uuidv4(),
            meta: undefined,
            name,
            namespaceType: 'single',
            tags: [],
            type: 'detection',
            version: 1,
          });
          return response.ok({ body: CreateSharedExceptionListResponse.parse(createdSharedList) });
        } catch (exc) {
          return siemResponse.error({
            body: exc.message,
            statusCode: 404,
          });
        }
      }
    );
};
