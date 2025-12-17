/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getSLOTemplateParamsSchema,
  sloTemplateSchema,
  type GetSLOTemplateResponse,
} from '@kbn/slo-schema';
import type {} from '../../domain/models';

import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

export const getSLOTemplateRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slo_templates/{templateId}',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: getSLOTemplateParamsSchema,
  handler: async ({
    request,
    logger,
    params,
    plugins,
    getScopedClients,
  }): Promise<GetSLOTemplateResponse> => {
    await assertPlatinumLicense(plugins);
    const { templateRepository } = await getScopedClients({ request, logger });

    const template = await templateRepository.findById(params.path.templateId);
    return sloTemplateSchema.encode(template);
  },
});
