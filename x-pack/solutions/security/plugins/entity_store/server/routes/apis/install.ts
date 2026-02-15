/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';
import { ENTITY_STORE_ROUTES } from '../../../common';
import {
  API_VERSIONS,
  DEFAULT_ENTITY_STORE_PERMISSIONS,
  LogExtractionBodyParams,
} from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityType, ALL_ENTITY_TYPES } from '../../../common/domain/definitions/entity_schema';

const bodySchema = z.object({
  entityTypes: z.array(EntityType).optional().default(ALL_ENTITY_TYPES),
  logExtraction: LogExtractionBodyParams.optional(),
});

export function registerInstall(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.INSTALL,
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: {
          request: {
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager } = entityStoreCtx;
        const { entityTypes, logExtraction: params } = req.body;
        logger.debug('Install api called');

        const privileges = await assetManager.getPrivileges(req, params?.additionalIndexPattern);
        if (!privileges.hasAllRequested) {
          return res.forbidden({
            body: {
              attributes: getMissingPrivileges(privileges),
              message: `User '${privileges.username}' has insufficient privileges`,
            },
          });
        }

        await Promise.all(entityTypes.map((type) => assetManager.initEntity(req, type, params)));

        return res.ok({
          body: {
            ok: true,
          },
        });
      })
    );
}

function getMissingPrivileges({ privileges: { kibana, elasticsearch } }: CheckPrivilegesResponse) {
  const unauthorized = (p: { authorized: boolean }) => !p.authorized;
  const toPrivilege = (p: { privilege: string }) => p.privilege;

  return {
    missing_kibana_privileges: kibana.filter(unauthorized).map(toPrivilege),
    missing_elasticsearch_privileges: {
      cluster: elasticsearch.cluster.filter(unauthorized).map(toPrivilege),
      index: Object.entries(elasticsearch.index).reduce<
        Array<{ index: string; privileges: string[] }>
      >((acc, [index, p]) => {
        const missing = p.filter(unauthorized).map(toPrivilege);
        if (missing.length) acc.push({ index, privileges: missing });
        return acc;
      }, []),
    },
  };
}
