/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  LIST_SOURCES_API_PATH,
  THREAT_INTEL_SOURCES_INDEX,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms, resolveCurrentSpaceId } from '../lib/space_filter';
import type { RouteRegistrationDeps } from '.';

const listBodySchema = schema.object({
  size: schema.maybe(schema.number({ min: 1, max: 500 })),
});

interface ThreatIntelSourceDoc {
  name?: string;
  adapter_type?: string;
  enabled?: boolean;
  config?: { url?: unknown };
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  space_id?: string;
}

export interface ListSourcesItem {
  source_id: string;
  name?: string;
  adapter_type?: string;
  enabled?: boolean;
  url?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
  space_id?: string;
}

const mapSourceHit = (hit: {
  _id?: string;
  _source?: ThreatIntelSourceDoc;
}): ListSourcesItem => {
  const source = hit._source ?? {};
  const configUrl = source.config?.url;
  return {
    source_id: hit._id ?? '',
    name: source.name,
    adapter_type: source.adapter_type,
    enabled: source.enabled,
    ...(typeof configUrl === 'string' ? { url: configUrl } : {}),
    tags: source.tags,
    created_at: source.created_at,
    updated_at: source.updated_at,
    space_id: source.space_id,
  };
};

/**
 * POST `/api/threat_intelligence/sources/list` — lightweight source catalog for Hub.
 */
export const registerListSourcesRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: LIST_SOURCES_API_PATH,
      access: 'public',
      security: {
        authz: {
          requiredPrivileges: [THREAT_INTELLIGENCE_API_PRIVILEGES.read],
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: { request: { body: listBodySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const size = request.body.size ?? 100;

        try {
          const searchResponse = await esClient.search<ThreatIntelSourceDoc>({
            index: THREAT_INTEL_SOURCES_INDEX,
            ignore_unavailable: true,
            size,
            track_total_hits: true,
            sort: [{ name: { order: 'asc' } }],
            query: {
              bool: {
                filter: [buildSpaceFilterTerms(spaceId)],
              },
            },
          });

          const sources = (searchResponse.hits.hits ?? []).map(mapSourceHit);
          const total =
            typeof searchResponse.hits.total === 'number'
              ? searchResponse.hits.total
              : searchResponse.hits.total?.value ?? sources.length;

          return response.ok({ body: { total, sources } });
        } catch (err) {
          logger.warn(`list_sources failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to list sources: ${(err as Error).message}` },
          });
        }
      }
    );
};
