/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { z } from '@kbn/zod/v4';
import type { IKibanaResponse } from '@kbn/core-http-server';
import { API_VERSIONS, ENTITY_STORE_ROUTES } from '../../../common';
import { DEFAULT_ENTITY_STORE_PERMISSIONS } from '../constants';
import type { EntityStorePluginRouter } from '../../types';
import { wrapMiddlewares } from '../middleware';
import { EntityType } from '../../../common/domain/definitions/entity_schema';
import {
  createKnowledgeIndicatorsReaderFromStreamsStart,
  loadStreamSchemaAliases,
} from '../../domain/streams_features';

const paramsSchema = z.object({
  entityType: EntityType,
});

const bodySchema = z.object({
  fromDateISO: z.string().datetime(),
  toDateISO: z.string().datetime(),
});

export function registerForceLogExtraction(router: EntityStorePluginRouter) {
  router.versioned
    .post({
      path: ENTITY_STORE_ROUTES.internal.FORCE_LOG_EXTRACTION,
      access: 'internal',
      summary: 'Force log extraction',
      description:
        'Trigger an immediate log extraction run for the specified entity type and date range.',
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
            params: buildRouteValidationWithZod(paramsSchema),
            body: buildRouteValidationWithZod(bodySchema),
          },
        },
      },
      wrapMiddlewares(async (ctx, req, res): Promise<IKibanaResponse> => {
        const entityStoreCtx = await ctx.entityStore;
        const {
          logger: baseLogger,
          logsExtractionClient,
          globalStateClient,
          streams,
        } = entityStoreCtx;
        const { entityType } = req.params;

        const logger = baseLogger.get('forceLogExtraction').get(entityType);
        logger.debug(`Force log extraction API called for entity type: ${entityType}`);

        // TODO(POC, Option E — Identity Alias Inference via Streams KI):
        // Load schema-feature alias contexts here so a manual `force_log_extraction`
        // covers the SAME alias-aware extraction surface the scheduled
        // `extract_entity_task` already runs. Without this, calling this route
        // skips `runAliasScopedPasses` entirely (`opts.aliasContexts` is `[]`),
        // which is fine for ECS-shaped streams but silently drops every fully
        // non-ECS stream (e.g. `logs-azure.activitylogs-*` whose identity lives
        // in `azure.activitylogs.identity.claims.*` — see
        // research/entity-store-ki-integration/02-options-considered.md).
        //
        // Reconsider before GA:
        //   - Should manual extractions ALWAYS replicate scheduled-pass behavior
        //     (current choice), or expose an explicit body flag so operators can
        //     opt out for diagnostic / replay scenarios?
        //   - Move alias-context loading into `LogsExtractionClient.extractLogs`
        //     itself so every caller is uniformly aliased and route handlers
        //     stop carrying loader plumbing? That would also let the scheduled
        //     task stop loading them at the call site.
        //   - The schema-feature filter is the SOLE document validator on
        //     alias-scoped passes (Option ① — trust-the-LLM-fully). Confirm we
        //     still want that contract once we leave POC.
        // Mirror the scheduled task's loader: alias-context lookup failures
        // are warn-logged and downgraded to a default-only extraction so a
        // bad streams round-trip can never break this manual route.
        let aliasContexts: Awaited<ReturnType<typeof loadStreamSchemaAliases>> = [];
        try {
          const reader = await createKnowledgeIndicatorsReaderFromStreamsStart({
            streams,
            request: req,
            logger,
          });
          const globalState = await globalStateClient.findOrThrow();
          aliasContexts = await loadStreamSchemaAliases(
            reader,
            { minConfidence: globalState.knowledgeIndicators.schemaAliasMinConfidence },
            logger
          );
        } catch (aliasLoadError) {
          const message =
            aliasLoadError instanceof Error ? aliasLoadError.message : String(aliasLoadError);
          logger.warn(
            `[entity_store] Failed to load schema-feature aliases (${message}); falling back to default-only extraction for this force_log_extraction call`
          );
        }

        const summary = await logsExtractionClient.extractLogs(entityType, {
          specificWindow: req.body,
          aliasContexts,
        });

        return res.ok({
          body: summary,
        });
      })
    );
}
