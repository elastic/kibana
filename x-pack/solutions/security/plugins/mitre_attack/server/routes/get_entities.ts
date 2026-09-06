/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import {
  GET_MITRE_ENTITIES_URL,
  GetMitreEntitiesRequestQuery,
  type GetMitreEntitiesResponse,
} from '@kbn/security-mitre-attack-common';
import type { MitreAttackRequestHandlerContext } from '../types';

export const registerGetEntitiesRoute = (
  router: IRouter<MitreAttackRequestHandlerContext>,
  logger: Logger
): void => {
  router.versioned
    .get({
      path: GET_MITRE_ENTITIES_URL,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetMitreEntitiesRequestQuery),
          },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<GetMitreEntitiesResponse>> => {
        const { getMitreDataClient } = await context.mitreAttack;
        const mitreDataClient = getMitreDataClient();

        if (!mitreDataClient) {
          return response.customError({
            statusCode: 503,
            body: { message: 'MITRE ATT&CK data client is not yet available' },
          });
        }

        const { framework, framework_version: frameworkVersion, types, status } = request.query;

        try {
          const collection = await mitreDataClient.list({
            framework,
            frameworkVersion,
            types,
            status,
          });

          // This endpoint just returns summary types for entities (no description field)
          // so the UI payload stays smaller and minimal to what we need. This could change if
          // we wanted to serve the description information from this endpoint in the future.
          const stripDescription = <T extends { description?: unknown }>(entity: T) =>
            omit(entity, 'description');
          const tactics = collection.tactics.map(stripDescription);
          const techniques = collection.techniques.map(stripDescription);
          const subtechniques = collection.subtechniques.map(stripDescription);

          return response.ok({
            body: {
              framework: collection.framework,
              framework_version: collection.frameworkVersion,
              tactics,
              techniques,
              subtechniques,
            },
          });
        } catch (err) {
          logger.error(
            `Error fetching MITRE entities: ${err instanceof Error ? err.message : String(err)}`
          );
          return response.customError({
            statusCode: 500,
            body: { message: 'An error occurred while fetching MITRE entities' },
          });
        }
      }
    );
};
