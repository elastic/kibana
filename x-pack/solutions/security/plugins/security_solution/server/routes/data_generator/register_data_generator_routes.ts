/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { getSavedObjectsTypes } from '@kbn/cases-plugin/common';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { StartServicesAccessor } from '@kbn/core/server';
import type { AuthenticatedUser } from '@kbn/core-security-common';

import type { SecuritySolutionPluginRouter } from '../../types';
import type { StartPlugins } from '../../plugin';

const isPrivilegedDataGeneratorUser = (user: AuthenticatedUser | null | undefined): boolean => {
  if (!user) return false;
  if (user.roles?.includes('superuser')) return true;
  // Kibana may authenticate API-key requests as `_es_api_key` with no Kibana roles in serverless.
  // Treat API-key auth as privileged for this dev-only route (still gated at route registration time).
  if (user.authentication_type === 'api_key') return true;
  if (user.authentication_realm?.name === '_es_api_key') return true;
  if (user.api_key?.id) return true;
  return false;
};

const hasInternalKibanaOriginHeader = (headerValue: unknown): boolean => {
  // `@kbn/test`'s KbnClient overwrites this header to `kbn-client` (see `buildRequest()`),
  // while browser/internal calls commonly use `Kibana`.
  const allowed = new Set(['Kibana', 'kbn-client']);
  if (typeof headerValue === 'string') return allowed.has(headerValue);
  if (Array.isArray(headerValue)) return headerValue.some((v) => allowed.has(v));
  return false;
};

const UpdateCaseTimestampsParams = z.object({
  caseId: z.string(),
});

const UpdateCaseTimestampsBody = z.object({
  /**
   * ISO timestamp that will be applied to `created_at`.
   */
  timestamp: z.string().datetime(),
});

/**
 * Internal-only, dev-only routes used by the Security Solution data generator script.
 *
 * `PUT /internal/security_solution/data_generator/cases/{caseId}/timestamps` backdates a Case by updating
 * its saved object `created_at` (ISO timestamp) so generated demo cases fall within the requested time range.
 * Gated by `x-elastic-internal-origin`, a privileged principal, and a Cases access check.
 */
export const registerDataGeneratorRoutes = (
  router: SecuritySolutionPluginRouter,
  getStartServices: StartServicesAccessor<StartPlugins>
) => {
  router.versioned
    .put({
      path: '/internal/security_solution/data_generator/cases/{caseId}/timestamps',
      access: 'internal',
      // Authz is enforced in-handler via Cases because this needs per-case authorization; a static
      // route-level privilege gate is too coarse (and doesn't map cleanly for serverless API-key principals).
      security: {
        authz: { enabled: false, reason: 'dev-only route; authorization enforced via Cases' },
      },
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
          // Dev-only route, intended to be called only by internal tooling (the data generator script).
          const internalOrigin = request.headers['x-elastic-internal-origin'];
          if (!hasInternalKibanaOriginHeader(internalOrigin)) {
            return response.forbidden({
              body: { message: 'Missing required x-elastic-internal-origin: Kibana header' },
            });
          }

          const [coreStart, pluginsStart] = await getStartServices();
          if (!pluginsStart.cases) {
            return response.notFound();
          }

          // Avoid relying solely on a spoofable header. This route is dev/staff-only at registration time,
          // but also requires a superuser-equivalent principal in practice (works in serverless API key flows).
          const currentUser = coreStart.security.authc.getCurrentUser(request);
          if (!isPrivilegedDataGeneratorUser(currentUser)) {
            return response.forbidden({
              body: { message: 'Data generator route requires a privileged user' },
            });
          }

          // Ensure the current user can access this case in this space before patching its saved object.
          // This keeps the route dev-only but still subject to real Cases authorization.
          const casesClient = await pluginsStart.cases.getCasesClientWithRequest(request);

          const internalRepo = coreStart.savedObjects.createInternalRepository([
            ...getSavedObjectsTypes(),
          ]);

          const spaceId = (await context.securitySolution).getSpaceId();
          const { caseId } = request.params;
          const { timestamp } = request.body;

          await casesClient.cases.get({ id: caseId });

          await internalRepo.update(
            'cases',
            caseId,
            {
              created_at: timestamp,
            },
            { namespace: spaceId, refresh: 'wait_for' }
          );

          return response.ok({ body: { success: true } });
        } catch (e) {
          const statusCode = (e as { output?: { statusCode?: number } })?.output?.statusCode;
          if (statusCode === 404) {
            return response.notFound();
          }
          if (statusCode === 403) {
            return response.forbidden();
          }
          // Keep the error message explicit so the data generator can surface it in logs.
          return response.customError({
            statusCode: 500,
            body: { message: (e as Error).message ?? String(e) },
          });
        }
      }
    );
};
