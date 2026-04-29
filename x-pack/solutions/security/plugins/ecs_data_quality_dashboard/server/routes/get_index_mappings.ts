/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IRouter, Logger } from '@kbn/core/server';

import { fetchMappings } from '../lib';
import { buildResponse } from '../lib/build_response';
import { GET_INDEX_MAPPINGS, INTERNAL_API_VERSION } from '../../common/constants';
import { GetIndexMappingsParams } from '../schemas/get_index_mappings';
import { buildRouteValidation } from '../schemas/common';
import { API_DEFAULT_ERROR_MESSAGE } from '../translations';

export const getIndexMappingsRoute = (router: IRouter, logger: Logger) => {
  router.versioned
    .get({
      path: GET_INDEX_MAPPINGS,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: buildRouteValidation(GetIndexMappingsParams) } },
      },
      async (context, request, response) => {
        const resp = buildResponse(response);

        try {
          const { client } = (await context.core).elasticsearch;
          const decodedIndexName = decodeURIComponent(request.params.pattern);

          const mappings = await fetchMappings(client, decodedIndexName);

          return response.ok({
            body: mappings,
          });
        } catch (err) {
          logger.error(JSON.stringify(err));

          return resp.error({
            body: err.message ?? API_DEFAULT_ERROR_MESSAGE,
            statusCode: err.statusCode ?? 500,
          });
        }
      }
    );
};
