/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { ReadListRequestQuery, ReadListResponse } from '@kbn/securitysolution-lists-common/api';

import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const readListRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'public',
      path: LIST_URL,
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
            query: buildRouteValidationWithZod(ReadListRequestQuery),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id } = request.query;
          const lists = await getListClient(context);
          const list = await lists.getList({ id });

          if (list == null) {
            return siemResponse.error({
              body: `list id: "${id}" does not exist`,
              statusCode: 404,
            });
          }

          return response.ok({ body: ReadListResponse.parse(list) });
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
