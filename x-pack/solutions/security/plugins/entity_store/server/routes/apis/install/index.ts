/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import type { IKibanaResponse } from '@kbn/core-http-server';
import type { CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { BodySchema } from './validator';
import { ENTITY_STORE_ROUTES } from '../../../../common';

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
            body: buildRouteValidationWithZod(BodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const { logger, assetManager } = entityStoreCtx;
        const { entityTypes, logExtraction: params } = req.body;
        logger.debug('Install api called');

        const privileges = await assetManager.getPrivileges(req, params?.additionalIndexPatterns);
        if (!privileges.hasAllRequested) {
          return res.forbidden({
            body: {
              attributes: getMissingPrivileges(privileges),
              message: `User '${privileges.username}' has insufficient privileges`,
            },
          });
        }

        const { engines } = await assetManager.getStatus();
        const installedTypes = new Set(engines.map((e) => e.type));
        const toInstall = entityTypes.filter((type) => !installedTypes.has(type));

        if (!toInstall.length) {
          return res.ok({ body: { ok: true } });
        }

        await Promise.all(toInstall.map((type) => assetManager.initEntity(req, type, params)));

        return res.created({ body: { ok: true } });
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
