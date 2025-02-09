/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findSloDefinitionsParamsSchema } from '@kbn/slo-schema';
import { KibanaSavedObjectsSLORepository } from '../../services';
import { FindSLODefinitions } from '../../services/find_slo_definitions';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const findSloDefinitionsRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slos/_definitions 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSloDefinitionsParamsSchema,
  handler: async ({ context, params, logger, plugins }) => {
    await assertPlatinumLicense(plugins);

    const soClient = (await context.core).savedObjects.client;
    const repository = new KibanaSavedObjectsSLORepository(soClient, logger);
    const findSloDefinitions = new FindSLODefinitions(repository);

    return await findSloDefinitions.execute(params?.query ?? {});
  },
});
