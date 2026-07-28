/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use the Elastic License 2.0.
 */

import { API_VERSIONS, INTERNAL_API_ACCESS, PND_INVESTIGATION_URL_TEMPLATE } from '@kbn/pnd-common';
import { schema } from '@kbn/config-schema';
import { PND_API_PRIVILEGE_READ } from '../../../common/constants';
import type { RouteDependencies } from '../register_routes';
import { getRealInvestigationById } from './real_data';

const PATH = `${PND_INVESTIGATION_URL_TEMPLATE}/endpoint-events` as const;

export const registerEndpointEventsRoute = ({
  router,
  logger,
  getInvestigationStore,
}: RouteDependencies) => {
  router.versioned
    .get({
      path: PATH,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: { requiredPrivileges: [PND_API_PRIVILEGE_READ] },
      },
      summary: 'Get real endpoint telemetry events for an investigation',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: schema.object({
              id: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        try {
          const investigationId = request.params.id;

          // Look up the investigation to get the affected host
          let investigation = getRealInvestigationById(investigationId);
          const store = getInvestigationStore();
          if (!investigation && store) {
            const esClient = (await context.core).elasticsearch.client.asCurrentUser;
            investigation = await store.getInvestigation(esClient, investigationId);
          }

          if (!investigation) {
            return response.notFound({
              body: { message: `Investigation ${investigationId} not found` },
            });
          }

          // Extract the hostname from affectedSurface (format: "HOST (IP) — Role")
          // Map prototype host names to real Elastic Defend enrolled hosts
          const HOST_MAP: Record<string, string> = {
            'FIN-WS-04': 'WIN-FIN-03',
            'FIN-DC-01': 'SRV-DC01',
            'FIN-WS-22': 'WKSTN-RECV01',
            'FIN-DB-02': 'SRV-DC01',
            'CFO-LAPTOP': 'WIN-FIN-03',
            'SALES-NAS': 'WKSTN-RECV01',
            'DMZ-SCAN-POOL': 'SRV-DC01',
            'BUILD-CI-03': 'WKSTN-RECV01',
          };
          const surface = investigation.affectedSurface ?? '';
          const hostMatch = surface.match(/^(\S+)/);
          const protoHost = hostMatch?.[1] ?? '';
          const hostname = HOST_MAP[protoHost] ?? protoHost;

          if (!hostname) {
            return response.ok({
              body: { events: [], total: 0, hostname: '' },
            });
          }

          // Query real endpoint telemetry via ES|QL
          const esClient = (await context.core).elasticsearch.client.asCurrentUser;
          const esqlQuery = `FROM logs-endpoint.events.*
            | WHERE host.name == "${hostname}"
            | SORT @timestamp DESC
            | LIMIT 50`;

          const rawResult = (await esClient.esql.query({
            query: esqlQuery,
          })) as unknown as {
            columns?: Array<{ name: string; type: string }>;
            values?: unknown[][];
          };

          // ES|QL returns columns + values (not hits._source)
          const columns = rawResult.columns ?? [];
          const rows = rawResult.values ?? [];
          const events = rows.map((row) => {
            const evt: Record<string, unknown> = {};
            columns.forEach((col, idx) => {
              evt[col.name] = row[idx];
            });
            return evt;
          });

          return response.ok({
            body: {
              events,
              total: events.length,
              hostname,
            },
          });
        } catch (error) {
          logger.error(`Failed to fetch endpoint events: ${error}`);
          // Return empty rather than 500 — endpoint telemetry may not be available
          return response.ok({
            body: { events: [], total: 0, hostname: '', error: 'Endpoint telemetry unavailable' },
          });
        }
      }
    );
};
