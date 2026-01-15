/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { SavedObjectsClient } from '@kbn/core/server';
import { SAVED_OBJECT_TYPES } from '@kbn/cases-plugin/common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { StartServicesAccessor } from '@kbn/core/server';

import type { SecuritySolutionPluginRouter } from '../../types';
import type { StartPlugins } from '../../plugin';

const UpdateCaseTimestampsParams = z.object({
  caseId: z.string(),
});

const UpdateCaseTimestampsBody = z.object({
  /**
   * ISO timestamp that will be applied to both `created_at` and `updated_at`.
   */
  timestamp: z.string(),
});

/**
 * Internal-only routes used by the Security Solution data generator script.
 */
export const registerDataGeneratorRoutes = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .put({
      path: '/internal/security_solution/data_generator/cases/{caseId}/timestamps',
      access: 'internal',
      security: { authz: { enabled: false, reason: 'data generator internal route' } },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateCaseTimestampsParams),
            body: buildRouteValidationWithZod(UpdateCaseTimestampsBody),
          },
        },
      },
      async (context, request, response) => {
        try {
          const [coreStart] = await getStartServices();
          const internalRepo = coreStart.savedObjects.createInternalRepository([
            ...SAVED_OBJECT_TYPES,
          ]);
          const soClient = new SavedObjectsClient(internalRepo);

          const spaceId = (await context.securitySolution).getSpaceId();
          const { caseId } = request.params;
          const { timestamp } = request.body;

          await soClient.update(
            'cases',
            caseId,
            {
              created_at: timestamp,
            },
            { namespace: spaceId, refresh: 'wait_for' }
          );

          return response.ok({ body: { success: true } });
        } catch (e) {
          // Keep the error message explicit so the data generator can surface it in logs.
          return response.customError({
            statusCode: 500,
            body: { message: (e as Error).message ?? String(e) },
          });
        }
      }
    );
};
