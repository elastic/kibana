/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkPurgeRollupSchema } from '@kbn/slo-schema';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';
import { PurgeRollupData } from '../../services/purge_rollup_data';
import { KibanaSavedObjectsSLORepository } from '../../services';

export const purgeRollupDataRoute = createSloServerRoute({
  endpoint: 'POST /api/observability/slos/_purge_rollup 2023-10-31',
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: bulkPurgeRollupSchema,
  handler: async ({ response, context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const core = await context.core;
    const esClient = core.elasticsearch.client.asCurrentUser;
    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const slos = await repository.findAllByIds(params.body.ids);

    const purgePolicy = params.body.purgePolicy;
    const purgeRollupData = new PurgeRollupData(esClient);

    if (params.query?.force !== 'true') {
      if (purgePolicy.purgeType === 'fixed_age') {
        if (
          slos.some((slo) => {
            purgePolicy.age.isShorterThan(slo.timeWindow.duration);
          })
        ) {
          return response.badRequest({
            body: `Age must be greater than or equal to the time window of the SLI data being purged.`,
          });
        }
        await purgeRollupData.execute(params.body.ids, purgePolicy.age);
      } else {
        if (
          slos.some(
            (slo) =>
              purgePolicy.timestamp.getMilliseconds() >
              Date.now() - slo.timeWindow.duration.asSeconds() * 1000
          )
        ) {
          return response.badRequest({
            body: `Timestamp must be before the effective time window of the SLI data being purged.`,
          });
        }
        await purgeRollupData.execute(params.body.ids, purgePolicy.timestamp);
      }
    }

    return response.noContent();
  },
});
