/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findSLOTemplatesParamsSchema,
  getSLOTemplateParamsSchema,
  sloTemplateSchema,
  type FindSLOTemplatesResponse,
  type GetSLOTemplateResponse,
} from '@kbn/slo-schema';
import { IllegalArgumentError } from '../../errors';
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

export const findSLOTemplatesRoute = createSloServerRoute({
  endpoint: 'GET /api/observability/slo_templates',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_read'],
    },
  },
  params: findSLOTemplatesParamsSchema,
  handler: async ({
    request,
    logger,
    plugins,
    params,
    getScopedClients,
  }): Promise<FindSLOTemplatesResponse> => {
    await assertPlatinumLicense(plugins);
    const { templateRepository } = await getScopedClients({ request, logger });
    const { page = 1, perPage = 20, search, tags } = params.query ?? {};
    if (page <= 0) {
      throw new IllegalArgumentError('page must be a positive integer');
    }
    if (perPage < 0) {
      throw new IllegalArgumentError('perPage must be greater than 0');
    }
    if (perPage > 100) {
      throw new IllegalArgumentError('perPage cannot be greater than 100');
    }

    const templatesPaginated = await templateRepository.search({
      pagination: { page, perPage },
      search,
      tags,
    });

    return {
      ...templatesPaginated,
      results: templatesPaginated.results.map((template) => sloTemplateSchema.encode(template)),
    };
  },
});
