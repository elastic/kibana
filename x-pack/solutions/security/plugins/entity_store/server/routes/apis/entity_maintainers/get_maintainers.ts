/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../../constants';
import type { EntityStorePluginRouter } from '../../../types';
import { wrapMiddlewares } from '../../middleware';
import type { EntityMaintainerListEntry } from '../../../domain/entity_maintainers';
import type { EntityMaintainerState, EntityMaintainerTaskStatus } from '../../../tasks/entity_maintainers/types';

interface EntityMaintainerResponseItem {
  id: string;
  taskStatus: EntityMaintainerTaskStatus;
  interval: string;
  description: string | null;
  customState: EntityMaintainerState | null;
  runs: number;
  lastSuccessTimestamp: string | null;
  lastErrorTimestamp: string | null;
}

function toGetMaintainersResponseItem(
  entry: EntityMaintainerListEntry
): EntityMaintainerResponseItem {
  const snapshot = entry.taskSnapshot;
  return {
    id: entry.id,
    taskStatus: entry.taskStatus,
    interval: entry.interval,
    description: entry.description ?? null,
    customState: snapshot?.state ?? null,
    runs: snapshot?.runs ?? 0,
    lastSuccessTimestamp: snapshot?.lastSuccessTimestamp ?? null,
    lastErrorTimestamp: snapshot?.lastErrorTimestamp ?? null,
  };
}

export function registerGetMaintainers(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: '/internal/security/entity-store/entity-maintainers',
      access: 'internal',
      security: {
        authz: DEFAULT_ENTITY_STORE_PERMISSIONS,
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v2,
        validate: false,
      },
      wrapMiddlewares(
        async (
          ctx,
          _req,
          res
        ): Promise<IKibanaResponse<{ list: EntityMaintainerResponseItem[] }>> => {
          const entityStoreCtx = await ctx.entityStore;
          const { entityMaintainersClient } = entityStoreCtx;
          const maintainers = await entityMaintainersClient.getMaintainers();
          const list: EntityMaintainerResponseItem[] = maintainers.map(
            toGetMaintainersResponseItem
          );

          return res.ok({ body: { list } });
        }
      )
    );
}
