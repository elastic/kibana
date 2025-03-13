/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import * as t from 'io-ts';
import { isEmpty } from 'lodash';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

const createSchema = t.type({
  body: t.type({
    sloIds: t.array(t.string),
    // TODO: Add maintenance windows params, with recurrence and all...
    // For the sake of spacetime, I will use a fix window
  }),
});

export const createMaintenanceWindowsRoute = createSloServerRoute({
  endpoint: 'POST /internal/observability/slos/_maintenance_windows',
  options: { access: 'internal' },
  security: {
    authz: {
      enabled: false,
      reason: 'spacetime',
    },
  },
  params: createSchema,
  handler: async ({ context, plugins, request, params }) => {
    await assertPlatinumLicense(plugins);
    const esClient = (await context.core).elasticsearch.client.asCurrentUser;
    const sloIds = params.body.sloIds;

    // TODO: Previously defined maintenance windows need to be reused and set in the pipeline.
    // 1. Store new maintenance window
    // 2. Fetch all active and future maintenance windows
    // 3. Create pipeline processors with previously fetch maintenance windows
    if (isEmpty(sloIds)) {
      await esClient.ingest.putPipeline({
        id: 'slo@maintenance',
        description: 'Global maintenance windows applied to any SLOs within the space.',
        processors: [
          {
            script: {
              lang: 'painless',
              source: dedent(`
                ZonedDateTime timestamp = ZonedDateTime.parse(ctx['@timestamp']);
                int hour = timestamp.getHour();
                if (hour >= 15 && hour < 16) {
                  ctx.isDuringMaintenanceWindow = true;
                } else {
                  ctx.isDuringMaintenanceWindow = false;
                }
            `),
            },
          },
        ],
      });
    } else {
      for (const sloId of sloIds) {
        await esClient.ingest.putPipeline({
          id: `slo-${sloId}@maintenance`,
          description: 'Maintenance windows applied to the SLO in that space',
          processors: [
            {
              script: {
                lang: 'painless',
                source: dedent(`
                  ZonedDateTime timestamp = ZonedDateTime.parse(ctx['@timestamp']);
                  int hour = timestamp.getHour();
                  if (hour >= 15 && hour < 16) {
                    ctx.isDuringMaintenanceWindow = true;
                  } else {
                    ctx.isDuringMaintenanceWindow = false;
                  }
              `),
              },
            },
          ],
        });
      }
    }
  },
});
