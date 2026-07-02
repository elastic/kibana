/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { buildStrictRouteValidationWithZod } from '../utils/build_strict_route_validation';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../../common';
import { EntityType } from '../../../../common/domain/definitions/entity_schema';
import { enforceEntityStorePrivileges } from '../utils/check_entity_store_privileges';
import { CadenceOverrideSchema } from '../utils/log_extraction_validator';

const paramsSchema = z.object({
  entityType: EntityType,
});

const bodySchema = z.object({
  logExtraction: CadenceOverrideSchema.optional(),
});

export function registerInstallByType(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.public.INSTALL_BY_TYPE,
      access: 'public',
      summary: 'Install a single entity type',
      description:
        'Install the Entity Store for a single entity type. Behaves like `POST /install` scoped ' +
        'to just this type: if the Entity Store is not installed yet, this bootstraps it (shared ' +
        'indices/templates, global configuration, entity maintainers) for this one type; if the ' +
        'store is already installed by other types, only this type is added. A no-op if this type ' +
        'is already installed. Optionally supply cadence settings (`frequency`, `delay`, ' +
        '`lookbackPeriod`) to set the cadence for this type only; fields left unset use the ' +
        "type's default cadence (e.g. Service/Generic install at a reduced cadence) or the shared " +
        'global value.',
      options: {
        tags: ['oas-tag:Security entity store'],
      },
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            params: buildStrictRouteValidationWithZod(paramsSchema),
            body: buildStrictRouteValidationWithZod(bodySchema),
          },
        },
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/entity_store_install_by_type.yaml'),
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const {
          logger,
          assetManagerClient: assetManager,
          entityMaintainersClient,
        } = await ctx.entityStore;
        const { entityType } = req.params;
        logger.debug(`Install by type api called for entity type: ${entityType}`);

        const forbidden = await enforceEntityStorePrivileges(assetManager, req, res);
        if (forbidden) return forbidden;

        const installed = await assetManager.installByType(req, entityType, req.body.logExtraction);
        if (!installed) {
          return res.ok({ body: { ok: true } });
        }

        await entityMaintainersClient.init(req);
        return res.created({ body: { ok: true } });
      })
    );
}
