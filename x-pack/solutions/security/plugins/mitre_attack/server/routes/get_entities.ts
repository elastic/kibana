/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, RequestHandlerContext } from '@kbn/core/server';
import { MITRE_ENTITIES_URL } from '../../common/constants';
import type { MitreEntityType } from '../../common/schema';
import type { MitreAttackDataClient } from '../services/mitre_attack_data_client';

const querySchema = schema.object({
  framework: schema.string({ defaultValue: 'enterprise', maxLength: 50 }),
  framework_version: schema.maybe(schema.string({ maxLength: 20 })),
  types: schema.maybe(
    schema.oneOf([
      schema.string({ maxLength: 50 }),
      schema.arrayOf(schema.string({ maxLength: 50 }), { maxSize: 3 }),
    ])
  ),
  include_inactive: schema.boolean({ defaultValue: false }),
});

export const registerGetEntitiesRoute = (
  router: IRouter<RequestHandlerContext>,
  getDataClient: () => MitreAttackDataClient | undefined
): void => {
  router.versioned
    .get({
      access: 'internal',
      path: MITRE_ENTITIES_URL,
      security: {
        authz: {
          enabled: false,
          reason: 'POC — internal MITRE reference data, no user data',
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: { request: { query: querySchema } },
      },
      async (_context, request, response) => {
        const client = getDataClient();
        if (!client) {
          return response.customError({
            statusCode: 503,
            body: { message: 'Service not yet ready' },
          });
        }

        const { framework, framework_version, types: rawTypes, include_inactive } = request.query;

        const types: MitreEntityType[] | undefined =
          rawTypes == null
            ? undefined
            : Array.isArray(rawTypes)
            ? (rawTypes as MitreEntityType[])
            : [rawTypes as MitreEntityType];

        const entities = await client.list({
          framework: framework as 'enterprise' | 'atlas',
          frameworkVersion: framework_version,
          types,
          includeInactive: include_inactive,
        });

        return response.ok({
          body: {
            framework,
            framework_version: framework_version ?? 'default',
            entities,
          },
        });
      }
    );
};
