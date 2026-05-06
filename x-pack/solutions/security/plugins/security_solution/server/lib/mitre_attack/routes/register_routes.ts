/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import type { MitreEntity } from '@kbn/security-mitre-attack-common';
import type { SecuritySolutionPluginRouter } from '../../../types';
import {
  GET_MITRE_BY_ID_ROUTE,
  GET_MITRE_SUBTECHNIQUES_ROUTE,
  GET_MITRE_TACTICS_ROUTE,
  GET_MITRE_TECHNIQUES_ROUTE,
  MITRE_ATTACK_API_VERSION,
  SEARCH_MITRE_ROUTE,
} from '../constants';
import {
  getByIdParamsSchema,
  getSubtechniquesQuerySchema,
  getTacticsQuerySchema,
  getTechniquesQuerySchema,
  searchQuerySchema,
} from './schemas';

/**
 * Routes share these properties so they all show up consistently in route
 * listings. We register at `internal` access since the API is consumed only by
 * the Kibana UI and server-side AI tools.
 */
const sharedRouteOptions = {
  access: 'internal' as const,
  security: {
    authz: {
      enabled: false as const,
      reason:
        'MITRE ATT&CK reference data is open-source content sourced from attack.mitre.org and bundled with the Kibana release; gating it behind privileges would not improve security and would block read access from any authenticated user.',
    },
  },
};

export const registerMitreAttackRoutes = (router: SecuritySolutionPluginRouter, logger: Logger) => {
  router.versioned
    .get({
      path: GET_MITRE_TACTICS_ROUTE,
      ...sharedRouteOptions,
    })
    .addVersion(
      {
        version: MITRE_ATTACK_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(getTacticsQuerySchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<{ entities: MitreEntity[] }>> => {
        try {
          const ctx = await context.resolve(['securitySolution']);
          const client = ctx.securitySolution.getMitreAttackDataClient();
          if (!client) {
            return response.notFound({ body: 'MITRE ATT&CK source disabled' });
          }
          const entities = await client.list({
            framework: request.query.framework,
            types: ['tactic'],
          });
          return response.ok({ body: { entities } });
        } catch (err) {
          logger.error(`MITRE tactics route failed: ${err.message}`);
          const error = transformError(err);
          return response.customError({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  router.versioned
    .get({
      path: GET_MITRE_TECHNIQUES_ROUTE,
      ...sharedRouteOptions,
    })
    .addVersion(
      {
        version: MITRE_ATTACK_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(getTechniquesQuerySchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<{ entities: MitreEntity[] }>> => {
        try {
          const ctx = await context.resolve(['securitySolution']);
          const client = ctx.securitySolution.getMitreAttackDataClient();
          if (!client) {
            return response.notFound({ body: 'MITRE ATT&CK source disabled' });
          }
          const entities = await client.list({
            framework: request.query.framework,
            types: ['technique'],
            tactic: request.query.tactic,
          });
          return response.ok({ body: { entities } });
        } catch (err) {
          logger.error(`MITRE techniques route failed: ${err.message}`);
          const error = transformError(err);
          return response.customError({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  router.versioned
    .get({
      path: GET_MITRE_SUBTECHNIQUES_ROUTE,
      ...sharedRouteOptions,
    })
    .addVersion(
      {
        version: MITRE_ATTACK_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(getSubtechniquesQuerySchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<{ entities: MitreEntity[] }>> => {
        try {
          const ctx = await context.resolve(['securitySolution']);
          const client = ctx.securitySolution.getMitreAttackDataClient();
          if (!client) {
            return response.notFound({ body: 'MITRE ATT&CK source disabled' });
          }
          const entities = await client.list({
            framework: request.query.framework,
            types: ['subtechnique'],
            techniqueId: request.query.technique,
          });
          return response.ok({ body: { entities } });
        } catch (err) {
          logger.error(`MITRE subtechniques route failed: ${err.message}`);
          const error = transformError(err);
          return response.customError({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  router.versioned
    .get({
      path: GET_MITRE_BY_ID_ROUTE,
      ...sharedRouteOptions,
    })
    .addVersion(
      {
        version: MITRE_ATTACK_API_VERSION,
        validate: {
          request: { params: buildRouteValidationWithZod(getByIdParamsSchema) },
        },
      },
      async (
        context,
        request,
        response
      ): Promise<IKibanaResponse<{ entity: MitreEntity | null }>> => {
        try {
          const ctx = await context.resolve(['securitySolution']);
          const client = ctx.securitySolution.getMitreAttackDataClient();
          if (!client) {
            return response.notFound({ body: 'MITRE ATT&CK source disabled' });
          }
          const entity = await client.getById(request.params.framework, request.params.id);
          return response.ok({ body: { entity: entity ?? null } });
        } catch (err) {
          logger.error(`MITRE by-id route failed: ${err.message}`);
          const error = transformError(err);
          return response.customError({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  router.versioned
    .get({
      path: SEARCH_MITRE_ROUTE,
      ...sharedRouteOptions,
    })
    .addVersion(
      {
        version: MITRE_ATTACK_API_VERSION,
        validate: {
          request: { query: buildRouteValidationWithZod(searchQuerySchema) },
        },
      },
      async (context, request, response): Promise<IKibanaResponse<{ entities: MitreEntity[] }>> => {
        try {
          const ctx = await context.resolve(['securitySolution']);
          const client = ctx.securitySolution.getMitreAttackDataClient();
          if (!client) {
            return response.notFound({ body: 'MITRE ATT&CK source disabled' });
          }
          const entities = await client.search({
            query: request.query.q,
            framework: request.query.framework,
            types: request.query.types,
            limit: request.query.limit,
          });
          return response.ok({ body: { entities } });
        } catch (err) {
          logger.error(`MITRE search route failed: ${err.message}`);
          const error = transformError(err);
          return response.customError({ body: error.message, statusCode: error.statusCode });
        }
      }
    );
};
