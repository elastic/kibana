/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { API_VERSIONS, INTERNAL_API_ACCESS, PND_WORKER_URL_TEMPLATE } from '@kbn/pnd-common';
import { getWatchWriteRouteAuthz } from '../watches/watch_route_security';
import type { RouteDependencies } from '../register_routes';

const UpdateWorkerRequestParams = z.object({
  workerId: z.string().min(1).max(128),
});

const UpdateWorkerRequestBody = z.object({
  enabled: z.boolean(),
});

/** Named so the reason travels with the response rather than living only in this file. */
const REFUSAL_REASON =
  'a worker is a read-only projection of an ai.agent step of a watch, so there is nothing to enable';

/**
 * Refuses every request with 400 (kibana-phf4.6).
 *
 * A worker used to carry a global enablement flag that this route wrote to the in-memory store.
 * Nothing consulted that flag at execution time, so the write changed no behaviour at all while the
 * response told the caller it had: the switch on the settings page moved, and the watch carried on
 * doing exactly what its lane said. A worker is now projected from the lane's real `ai.agent` steps,
 * which is not a thing that can be toggled — the step exists because the YAML declares it.
 *
 * The route stays registered, validated, and refuses out loud rather than being deleted, for three
 * reasons. A 404 would read as "wrong id" and invite a retry with a different one. Removing it
 * entirely would make an older client's request 404 the same way a typo does. And validating the body
 * before refusing keeps the answer about the *thing being asked for* rather than about how it was
 * spelled, which is what makes the reason below actionable.
 */
export const registerUpdateWorkerRoute = ({ router }: RouteDependencies) => {
  router.versioned
    .patch({
      path: PND_WORKER_URL_TEMPLATE,
      access: INTERNAL_API_ACCESS,
      security: {
        authz: getWatchWriteRouteAuthz(),
      },
      summary: 'Refuse a PND worker update',
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: buildRouteValidationWithZod(UpdateWorkerRequestParams),
            body: buildRouteValidationWithZod(UpdateWorkerRequestBody),
          },
        },
      },
      async (_context, request, response) =>
        response.badRequest({
          body: {
            message: `Cannot update worker "${request.params.workerId}": ${REFUSAL_REASON}`,
          },
        })
    );
};
