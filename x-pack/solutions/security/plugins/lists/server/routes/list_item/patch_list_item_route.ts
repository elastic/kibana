/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import { LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  PatchListItemRequestBody,
  PatchListItemResponse,
} from '@kbn/securitysolution-lists-common/api';

import type { ListsPluginRouter } from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

export const patchListItemRoute = (router: ListsPluginRouter): void => {
  router.versioned
    .patch({
      access: 'public',
      path: LIST_ITEM_URL,
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
            body: buildRouteValidationWithZod(PatchListItemRequestBody),
          },
        },
        version: '2023-10-31',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { value, id, meta, _version, refresh } = request.body;
          const shouldRefresh = refresh === 'true' ? true : false;
          const lists = await getListClient(context);

          const dataStreamExists = await lists.getListItemDataStreamExists();
          // needs to be migrated to data stream if index exists
          if (!dataStreamExists) {
            const indexExists = await lists.getListItemIndexExists();
            if (indexExists) {
              await lists.migrateListItemIndexToDataStream();
            }
          }

          const listItem = await lists.patchListItem({
            _version,
            id,
            meta,
            refresh: shouldRefresh,
            value,
          });

          if (listItem == null) {
            return siemResponse.error({
              body: `list item id: "${id}" not found`,
              statusCode: 404,
            });
          }

          return response.ok({ body: PatchListItemResponse.parse(listItem) });
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
