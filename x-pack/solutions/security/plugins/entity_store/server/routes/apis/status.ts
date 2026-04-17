/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'node:path';
import { buildRouteValidationWithZod, BooleanFromString } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import type { EntityStoreStatus, GetStatusSuccessResult } from '../../domain/types';
import type { LogExtractionConfig } from '../../domain/saved_objects';
import { ENTITY_STORE_STATUS } from '../../domain/constants';

/**
 * Legacy engine descriptor from V1. will be removed in a future version.
 */
type LogExtractionStateForV1 = Omit<
  LogExtractionConfig,
  'additionalIndexPatterns' | 'docsLimit' | 'paginationTimestamp' | 'lastExecutionTimestamp'
>;
interface LegacyEngineDescriptorV1 extends LogExtractionStateForV1 {
  docsPerSecond: -1;
  indexPattern: '';
  enrichPolicyExecutionInterval: null;
  timestampField: '@timestamp';
  maxPageSearchSize: 10000;
  lastExecutionTimestamp: string | undefined;
}

type StatusEngine = Omit<
  GetStatusSuccessResult['engines'][number],
  'versionState' | 'logExtractionState'
> &
  LegacyEngineDescriptorV1;

interface EntityStoreStatusResponseBody {
  status: EntityStoreStatus;
  engines: StatusEngine[];
}

const querySchema = z.object({
  include_components: BooleanFromString.optional()
    .default(false)
    .describe('If true, returns a detailed status of each engine including all its components.'),
});
export type StatusRequestQuery = z.infer<typeof querySchema>;

function toPublicEngine(
  engine: GetStatusSuccessResult['engines'][number],
  logsExtractionConfig: LogExtractionConfig
): StatusEngine {
  const { versionState, logExtractionState, ...rest } = engine;
  const { delay, timeout, frequency, lookbackPeriod, fieldHistoryLength, filter, maxLogsPerPage } =
    logsExtractionConfig;

  return {
    ...rest,
    // TODO: Remove the legacy fields once we stop supporting V1.
    filter,
    delay,
    timeout,
    frequency,
    lookbackPeriod,
    fieldHistoryLength,
    maxLogsPerPage,
    docsPerSecond: -1,
    indexPattern: '',
    enrichPolicyExecutionInterval: null,
    timestampField: '@timestamp',
    maxPageSearchSize: 10000,
    lastExecutionTimestamp: logExtractionState.lastExecutionTimestamp,
  };
}

export function registerStatus(router: EntityStorePluginRouter) {
  router.versioned
    .get({
      path: ENTITY_STORE_ROUTES.public.STATUS,
      access: 'public',
      summary: 'Get Entity Store status',
      description:
        'Get the overall Entity Store status and per-engine statuses, optionally including component-level health details.',
      options: {
        tags: ['oas-tag:Security Entity Store'],
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
            query: buildRouteValidationWithZod(querySchema),
          },
        },
        options: {
          oasOperationObject: () => path.join(__dirname, 'examples/entity_store_status.yaml'),
        },
      },
      wrapMiddlewares(
        async (ctx, req, res): Promise<IKibanaResponse<EntityStoreStatusResponseBody>> => {
          const entityStoreCtx = await ctx.entityStore;
          const { logger, assetManagerClient: assetManager } = entityStoreCtx;
          logger.debug('Status API invoked');
          const withComponents = req.query.include_components;
          const { status, engines, ...rest } = await assetManager.getStatus(withComponents);

          if (status === ENTITY_STORE_STATUS.NOT_INSTALLED) {
            return res.ok({
              body: { status, engines: [] },
            });
          }

          const { logsExtractionConfig } = rest as GetStatusSuccessResult;

          return res.ok({
            body: {
              status,
              engines: engines.map((engine) => toPublicEngine(engine, logsExtractionConfig)),
            },
          });
        }
      )
    );
}
