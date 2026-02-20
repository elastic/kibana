/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod, BooleanFromString } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { ENTITY_STORE_ROUTES } from '../../../common';
import { API_VERSIONS, DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import type { EntityStoreStatus, GetStatusResult } from '../../domain/types';
import type { LogExtractionState } from '../../domain/definitions/saved_objects';

/**
 * Legacy engine descriptor from V1. will be removed in a future version.
 */
type LogExtractionStateForV1 = Omit<
  LogExtractionState,
  'additionalIndexPatterns' | 'docsLimit' | 'paginationTimestamp' | 'lastExecutionTimestamp'
>;
interface LegacyEngineDescriptorV1 extends LogExtractionStateForV1 {
  docsPerSecond: -1;
  indexPattern: '';
  enrichPolicyExecutionInterval: null;
  timestampField: '@timestamp';
  maxPageSearchSize: 10000;
}

type StatusEngine = Omit<GetStatusResult['engines'][number], 'versionState'> &
  LegacyEngineDescriptorV1;

interface EntityStoreStatusResponseBody {
  status: EntityStoreStatus;
  engines: StatusEngine[];
}

const querySchema = z.object({
  include_components: BooleanFromString.optional().default(false),
});
export type StatusRequestQuery = z.infer<typeof querySchema>;

function toPublicEngine(engine: GetStatusResult['engines'][number]): StatusEngine {
  const { versionState, ...rest } = engine;
  const { delay, timeout, frequency, lookbackPeriod, fieldHistoryLength, filter } =
    rest.logExtractionState;
  return {
    ...rest,
    // TODO: Remove the legacy fields once we stop supporting V1.
    filter,
    delay,
    timeout,
    frequency,
    lookbackPeriod,
    fieldHistoryLength,
    docsPerSecond: -1,
    indexPattern: '',
    enrichPolicyExecutionInterval: null,
    timestampField: '@timestamp',
    maxPageSearchSize: 10000,
  };
}

export function registerStatus(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.STATUS,
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
            query: buildRouteValidationWithZod(querySchema),
          },
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse<EntityStoreStatusResponseBody>> => {
          const entityStoreCtx = await ctx.entityStore;
          const { logger, assetManager } = entityStoreCtx;
          logger.debug('Status API invoked');
          const withComponents = req.query.include_components;
          const { status, engines } = await assetManager.getStatus(withComponents);

          return res.ok({
            body: {
              status,
              engines: engines.map(toPublicEngine),
            },
          });
        }
      )
    );
}
