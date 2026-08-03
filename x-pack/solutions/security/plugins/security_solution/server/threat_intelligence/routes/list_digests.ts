/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  LIST_DIGESTS_API_PATH,
  THREAT_INTEL_DIGESTS_INDEX,
  THREAT_INTELLIGENCE_API_PRIVILEGES,
} from '../../../common/threat_intelligence/hub';
import { buildSpaceFilterTerms, resolveCurrentSpaceId } from '../lib/space_filter';
import type { RouteRegistrationDeps } from '.';

const listDigestsBodySchema = schema.object({
  size: schema.maybe(schema.number({ min: 1, max: 200 })),
  time_range: schema.maybe(
    schema.object({
      from: schema.string(),
      to: schema.string(),
    })
  ),
});

export interface ListDigestsItem {
  digest_id: string;
  '@timestamp': string;
  subscription_id: string;
  time_range?: { from?: string; to?: string };
  report_count: number;
  delivered?: boolean;
  delivery_error?: string;
  advisory_id?: string;
}

/**
 * POST `/api/threat_intelligence/digests/list` — delivered digests for Hub.
 * Filtered by Hub time range on `@timestamp` (when the digest was generated).
 */
export const registerListDigestsRoute = ({
  router,
  logger,
  getSpacesService,
}: RouteRegistrationDeps): void => {
  router.versioned
    .post({
      path: LIST_DIGESTS_API_PATH,
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
        validate: { request: { body: listDigestsBodySchema } },
      },
      async (context, request, response) => {
        const core = await context.core;
        const esClient = core.elasticsearch.client.asCurrentUser;
        const spaceId = resolveCurrentSpaceId(getSpacesService(), request);
        const size = request.body.size ?? 50;
        const timeRange = request.body.time_range;

        const filters: Record<string, unknown>[] = [buildSpaceFilterTerms(spaceId)];
        if (timeRange?.from || timeRange?.to) {
          filters.push({
            range: {
              '@timestamp': {
                ...(timeRange.from ? { gte: timeRange.from } : {}),
                ...(timeRange.to ? { lte: timeRange.to } : {}),
              },
            },
          });
        }

        try {
          const searchResponse = await esClient.search({
            index: THREAT_INTEL_DIGESTS_INDEX,
            ignore_unavailable: true,
            size,
            track_total_hits: true,
            sort: [{ '@timestamp': { order: 'desc' } }],
            query: {
              bool: { filter: filters },
            },
            _source: [
              '@timestamp',
              'subscription_id',
              'time_range',
              'report_ids',
              'delivered',
              'delivery_error',
              'advisory_id',
            ],
          });

          const digests: ListDigestsItem[] = (searchResponse.hits.hits ?? []).map((hit) => {
            const source = (hit._source ?? {}) as {
              '@timestamp'?: string;
              subscription_id?: string;
              time_range?: { from?: string; to?: string };
              report_ids?: string[];
              delivered?: boolean;
              delivery_error?: string;
              advisory_id?: string;
            };
            return {
              digest_id: hit._id ?? '',
              '@timestamp': source['@timestamp'] ?? '',
              subscription_id: source.subscription_id ?? '',
              ...(source.time_range ? { time_range: source.time_range } : {}),
              report_count: Array.isArray(source.report_ids) ? source.report_ids.length : 0,
              ...(typeof source.delivered === 'boolean' ? { delivered: source.delivered } : {}),
              ...(source.delivery_error ? { delivery_error: source.delivery_error } : {}),
              ...(source.advisory_id ? { advisory_id: source.advisory_id } : {}),
            };
          });

          const totalRaw = searchResponse.hits.total;
          const total =
            typeof totalRaw === 'number'
              ? totalRaw
              : typeof totalRaw?.value === 'number'
              ? totalRaw.value
              : digests.length;

          return response.ok({ body: { total, digests } });
        } catch (err) {
          logger.warn(`list_digests failed: ${(err as Error).message}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to list digests: ${(err as Error).message}` },
          });
        }
      }
    );
};
