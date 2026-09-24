/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validate } from '@kbn/securitysolution-io-ts-utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { INTERNAL_FIND_LISTS_BY_SIZE } from '@kbn/securitysolution-list-constants';
import { chunk } from 'lodash';
import { LISTS_API_READ } from '@kbn/security-solution-features/constants';

import type { ListsPluginRouter } from '../../types';
import { decodeCursor } from '../../services/utils';
import { findListsBySizeRequestQuery, findListsBySizeResponse } from '../../../common/api';
import { buildRouteValidation, buildSiemResponse, getListClient } from '../utils';

export const findListsBySizeRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .get({
      access: 'internal',
      path: INTERNAL_FIND_LISTS_BY_SIZE,
      security: {
        authz: {
          requiredPrivileges: [LISTS_API_READ],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            query: buildRouteValidation(findListsBySizeRequestQuery),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const listClient = await getListClient(context);
          const {
            cursor,
            filter: filterOrUndefined,
            page: pageOrUndefined,
            per_page: perPageOrUndefined,
            sort_field: sortField,
            sort_order: sortOrder,
          } = request.query;

          const page = pageOrUndefined ?? 1;
          const perPage = perPageOrUndefined ?? 20;
          const filter = filterOrUndefined ?? '';
          const {
            isValid,
            errorMessage,
            cursor: [currentIndexPosition, searchAfter],
          } = decodeCursor({
            cursor,
            page,
            perPage,
            sortField,
          });
          if (!isValid) {
            return siemResponse.error({
              body: errorMessage,
              statusCode: 400,
            });
          } else {
            const valueLists = await listClient.findList({
              currentIndexPosition,
              filter,
              page,
              perPage,
              runtimeMappings: undefined,
              searchAfter,
              sortField,
              sortOrder,
            });

            const listBooleans: boolean[] = [];

            // The small versus large decision, including the legacy versus lookup
            // storage split and the range-specific counting, lives in the ListClient.
            const chunks = chunk(valueLists.data, 10);
            for (const listChunk of chunks) {
              const booleans = await Promise.all(
                listChunk.map((valueList) => listClient.isSmallList({ list: valueList }))
              );
              listBooleans.push(...booleans);
            }

            const smallLists = valueLists.data.filter((valueList, index) => listBooleans[index]);
            const largeLists = valueLists.data.filter((valueList, index) => !listBooleans[index]);

            const [validated, errors] = validate(
              { largeLists, smallLists },
              findListsBySizeResponse
            );
            if (errors != null) {
              return siemResponse.error({ body: errors, statusCode: 500 });
            } else {
              return response.ok({ body: validated ?? {} });
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
