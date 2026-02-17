/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { createSLOParamsSchema } from '@kbn/slo-schema';
import type { CreateSLOParams, CreateSLOResponse } from '@kbn/slo-schema';
import { CreateSLO } from '../../services';
import { createSloServerRoute } from '../create_slo_server_route';
import { assertPlatinumLicense } from './utils/assert_platinum_license';

const sloBodySchema = createSLOParamsSchema.props.body;

const aiBulkCreateSlosParamsSchema = t.type({
  body: t.type({
    slos: t.array(sloBodySchema),
  }),
});

export const aiBulkCreateSlosRoute = createSloServerRoute({
  endpoint: 'POST /internal/slo/ai/bulk-create',
  options: { access: 'internal' },
  security: {
    authz: {
      requiredPrivileges: ['slo_write'],
    },
  },
  params: aiBulkCreateSlosParamsSchema,
  handler: async ({ context, params, logger, request, plugins, corePlugins, getScopedClients }) => {
    await assertPlatinumLicense(plugins);

    const {
      scopedClusterClient,
      internalSoClient,
      spaceId,
      repository,
      transformManager,
      summaryTransformManager,
    } = await getScopedClients({ request, logger });

    const core = await context.core;
    const userId = core.security.authc.getCurrentUser()?.username!;
    const basePath = corePlugins.http.basePath;

    const createSLO = new CreateSLO(
      scopedClusterClient,
      repository,
      internalSoClient,
      transformManager,
      summaryTransformManager,
      logger,
      spaceId,
      basePath,
      userId
    );

    const { slos } = params.body;
    const results: Array<{
      success: boolean;
      id?: string;
      name: string;
      error?: string;
    }> = [];

    for (const sloParams of slos) {
      try {
        const response: CreateSLOResponse = await createSLO.execute(sloParams as CreateSLOParams);
        results.push({
          success: true,
          id: response.id,
          name: sloParams.name,
        });
      } catch (error) {
        logger.warn(`Failed to create SLO "${sloParams.name}": ${error.message}`);
        results.push({
          success: false,
          name: sloParams.name,
          error: error.message,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.filter((r) => !r.success).length;

    return {
      results,
      summary: { total: slos.length, success: successCount, failure: failureCount },
    };
  },
});
