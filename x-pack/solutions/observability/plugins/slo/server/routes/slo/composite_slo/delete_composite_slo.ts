/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { deleteCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultCompositeSLORepository } from '../../../services/composite_slo_repository';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';

export const deleteCompositeSLORoute = createSloServerRoute({
  endpoint: 'DELETE /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: deleteCompositeSLOParamsSchema,
  handler: async ({ response, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { soClient } = await getScopedClients({ request, logger });
    const repository = new DefaultCompositeSLORepository(soClient, logger);

    await repository.deleteById(params.path.id);

    return response.noContent();
  },
});
