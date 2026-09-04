/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, CoreSetup } from '@kbn/core/server';
import {
  getEntityIndexPattern,
  ENTITY_SCHEMA_VERSION_V2,
  ENTITY_METADATA,
} from '@kbn/entity-store/common';
import type { ServiceDependenciesResponse } from '../../common/service_dependencies';
import { isBackendTarget, toBackendLabel } from '../../common/service_dependencies';

// Hardcoded namespace to match SERVICE_ENTITIES_QUERY in constants.ts.
// TODO: make space-aware by reading the active space from context.
const NAMESPACE = 'default';

const QUERY_SCHEMA = schema.object({
  start: schema.string({ maxLength: 100 }),
  end: schema.string({ maxLength: 100 }),
});

export const registerServiceDependenciesRoutes = ({
  router,
  getStartServices,
}: {
  router: IRouter;
  getStartServices: CoreSetup['getStartServices'];
}) => {
  router.get(
    {
      path: '/internal/entities_caue/service_dependencies',
      validate: { query: QUERY_SCHEMA },
      security: {
        authz: { enabled: false, reason: 'Service dependencies read inherits ES privileges' },
      },
    },
    async (_ctx, req, res) => {
      const { start, end } = req.query;
      const [coreStart] = await getStartServices();

      const esClient = coreStart.elasticsearch.client.asScoped(req).asCurrentUser;

      // Query the data stream directly (not getMetadataEntityIndexPattern which appends `-*`
      // and fails to match because backing indices carry a `.ds-` prefix).
      const metadataIndex = getEntityIndexPattern({
        schemaVersion: ENTITY_SCHEMA_VERSION_V2,
        dataset: ENTITY_METADATA,
        namespace: NAMESPACE,
      });

      const resp = await esClient
        .search<
          unknown,
          {
            edges: {
              buckets: Array<{
                key: { source: string; target: string };
                last_seen: { value_as_string?: string };
              }>;
            };
          }
        >({
          index: metadataIndex,
          allow_no_indices: true,
          ignore_unavailable: true,
          size: 0,
          query: {
            bool: {
              filter: [
                { term: { 'event.action': 'relationship_observed' } },
                { exists: { field: 'entity.relationships.depends_on.target' } },
                { range: { '@timestamp': { gte: start, lte: end } } },
              ],
            },
          },
          aggs: {
            edges: {
              composite: {
                size: 10000,
                sources: [
                  { source: { terms: { field: 'entity.id' } } },
                  { target: { terms: { field: 'entity.relationships.depends_on.target' } } },
                ],
              },
              aggs: {
                last_seen: {
                  max: { field: '@timestamp' },
                },
              },
            },
          },
        })
        .catch((_err: Error) => null);

      if (!resp) {
        return res.ok<ServiceDependenciesResponse>({ body: { edges: [] } });
      }

      const edges = (resp.aggregations?.edges.buckets ?? []).map((bucket) => {
        const rawTarget = bucket.key.target;
        const backend = isBackendTarget(rawTarget);
        return {
          source: bucket.key.source,
          // Strip the `>` prefix so the UI receives the bare resource name.
          target: backend ? toBackendLabel(rawTarget) : rawTarget,
          targetKind: (backend ? 'backend' : 'service') as 'backend' | 'service',
          lastSeen: bucket.last_seen.value_as_string ?? new Date(0).toISOString(),
        };
      });

      return res.ok<ServiceDependenciesResponse>({ body: { edges } });
    }
  );
};
