/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { getErrorGroups } from '../../queries/get_error_groups';
import { safeJsonParse } from './safe_json_parse';

const MAX_QUERY_PARAM_LENGTH = 4096;

export const getErrorGroupsRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.ERROR_GROUPS,
  validate: {
    query: schema.object({
      from: schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH }),
      to: schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH }),
      monitorTypes: schema.maybe(schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH })),
      locations: schema.maybe(schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH })),
      tags: schema.maybe(schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH })),
      projects: schema.maybe(schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH })),
      statusCodes: schema.maybe(schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH })),
      query: schema.maybe(schema.string({ maxLength: MAX_QUERY_PARAM_LENGTH })),
    }),
  },
  handler: async ({ syntheticsEsClient, request, spaceId }) => {
    const { from, to, monitorTypes, locations, tags, projects, statusCodes, query } = request.query;

    return await getErrorGroups({
      syntheticsEsClient,
      from,
      to,
      monitorTypes: safeJsonParse(monitorTypes),
      locations: safeJsonParse(locations),
      tags: safeJsonParse(tags),
      projects: safeJsonParse(projects),
      statusCodes: safeJsonParse(statusCodes),
      query: query || undefined,
      spaceId,
    });
  },
});
