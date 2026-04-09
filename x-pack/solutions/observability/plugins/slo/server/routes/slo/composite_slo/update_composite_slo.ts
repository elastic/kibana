/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateCompositeSLOParamsSchema } from '@kbn/slo-schema';
import { DefaultCompositeSLORepository } from '../../../services/composite_slo_repository';
import { createSloServerRoute } from '../../create_slo_server_route';
import { assertPlatinumLicense } from '../utils/assert_platinum_license';
import { validateCompositeSloMembers } from './create_composite_slo';

export const updateCompositeSLORoute = createSloServerRoute({
  endpoint: 'PUT /api/observability/slo_composites/{id} 2023-10-31',
  options: { access: 'public' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: updateCompositeSLOParamsSchema,
  handler: async ({ context, params, logger, request, plugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const { soClient } = await getScopedClients({ request, logger });
    const repository = new DefaultCompositeSLORepository(soClient, logger);

    const existing = await repository.findById(params.path.id);

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username;

    const updated = {
      ...existing,
      ...params.body,
      updatedAt: new Date(),
      updatedBy: userId ?? existing.updatedBy,
    };

    validateCompositeSloMembers(updated.members);

    return await repository.update(updated);
  },
});
