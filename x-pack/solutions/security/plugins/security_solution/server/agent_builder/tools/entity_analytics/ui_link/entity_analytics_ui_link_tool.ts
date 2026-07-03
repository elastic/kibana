/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';
import { securityTool } from '../../constants';
import { buildUiLinkUrl, type BuildUiLinkArgs } from './urls';
import { resolveWatchlistByName } from './resolve_watchlist';

export const ENTITY_ANALYTICS_UI_LINK_TOOL_ID = securityTool('entity_analytics_ui_link');

const MAX_WATCHLISTS_SCANNED = 100;

// The builtin tool schema must be a `ZodObject`, so this can't be a discriminated union.
// `intent` and `entityType` are constrained via enums; the params that only apply to some
// intents are optional here and their per-intent requiredness is enforced in the handler
// (which returns an error the model can retry against).
export const entityAnalyticsUiLinkSchema = z.object({
  intent: z
    .enum([
      'entity_analytics_settings',
      'risk_engine_settings',
      'asset_criticality_bulk',
      'entity_resolution_bulk',
      'engine_status',
      'watchlists_list',
      'watchlist_edit',
      'entity_resolution',
    ])
    .describe('Which Entity Analytics UI destination to link to.'),
  watchlist: z
    .string()
    .optional()
    .describe(
      "Required for intent 'watchlist_edit' — the watchlist's id OR its name; the tool resolves either to the correct watchlist. Prefer whatever the user gave you (usually the name)."
    ),
  entityType: z
    .enum(['host', 'user', 'service'])
    .optional()
    .describe("Required for intent 'entity_resolution' — the entity type."),
  entityName: z
    .string()
    .optional()
    .describe(
      "Optional for intent 'entity_resolution' — the entity's display name (entity.name), e.g. 'myserver' or 'jsmith'. Only populates the flyout header title; the flyout opens and resolves from entityId regardless. Pass it when you have it."
    ),
  entityId: z
    .string()
    .optional()
    .describe(
      "Required for intent 'entity_resolution' — the entity's EUID (entity.id), e.g. 'host:myserver456' or 'user:jsmith123'."
    ),
});

type EntityAnalyticsUiLinkToolArgs = z.infer<typeof entityAnalyticsUiLinkSchema>;

const errorResult = (message: string) => ({
  results: [{ type: ToolResultType.error as const, data: { message } }],
});

export const entityAnalyticsUiLinkTool = (
  core: SecuritySolutionPluginCoreSetupDependencies
): BuiltinToolDefinition<typeof entityAnalyticsUiLinkSchema> => ({
  id: ENTITY_ANALYTICS_UI_LINK_TOOL_ID,
  type: ToolType.builtin,
  tags: ['entity-analytics'],
  description: `Build a clickable link into the Entity Analytics UI for actions that cannot be performed in chat. Returns a single \`url\` — render it in your reply as a markdown link \`[title](url)\`; never invent or hand-edit the URL. Intents:
- \`entity_analytics_settings\` — the Entity Analytics management page (the global switch to enable/disable Entity Analytics and to clear all entity data).
- \`risk_engine_settings\` — Risk Score management tab (configure risk scoring, or trigger a re-score via the Run button).
- \`asset_criticality_bulk\` — Asset Criticality management tab (CSV upload / bulk criticality changes).
- \`entity_resolution_bulk\` — Entity Resolution management tab (bulk-link entities to resolution targets by importing a CSV). For a SINGLE entity, use \`entity_resolution\` instead.
- \`engine_status\` — the Entity Store / engine Status tab.
- \`watchlists_list\` — the Watchlists management tab (to pick a watchlist when none is specified).
- \`watchlist_edit\` — a specific watchlist's edit flyout (pass \`watchlist\` = the watchlist id or name; the tool resolves it).
- \`entity_resolution\` — a SINGLE entity's Resolution ("Add entities to resolution group") flyout (requires \`entityType\` and \`entityId\` from \`security.get_entity\`; \`entityName\` is optional — it only sets the header title).`,
  schema: entityAnalyticsUiLinkSchema,
  handler: async (rawArgs, { logger, spaceId, esClient, savedObjectsClient }) => {
    const args = rawArgs as EntityAnalyticsUiLinkToolArgs;
    let linkArgs: BuildUiLinkArgs;

    switch (args.intent) {
      case 'entity_analytics_settings':
      case 'risk_engine_settings':
      case 'asset_criticality_bulk':
      case 'entity_resolution_bulk':
      case 'engine_status':
      case 'watchlists_list':
        linkArgs = { intent: args.intent };
        break;

      case 'entity_resolution':
        if (!args.entityType || !args.entityId) {
          return errorResult(
            "intent 'entity_resolution' requires 'entityType' and 'entityId' (from security.get_entity)."
          );
        }
        linkArgs = {
          intent: 'entity_resolution',
          entityType: args.entityType,
          entityId: args.entityId,
          entityName: args.entityName,
        };
        break;

      case 'watchlist_edit': {
        if (!args.watchlist) {
          return errorResult(
            "intent 'watchlist_edit' requires 'watchlist' (the watchlist id or name)."
          );
        }
        const client = new WatchlistConfigClient({
          soClient: savedObjectsClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        });

        // Treat the reference as an id first. Only when that misses do we fall back to a name scan.
        try {
          const byId = await client.get(args.watchlist);
          if (byId.id) {
            linkArgs = { intent: 'watchlist_edit', watchlistId: byId.id };
            break;
          }
        } catch {
          logger.debug(
            `[${ENTITY_ANALYTICS_UI_LINK_TOOL_ID}] watchlist id not found: ${args.watchlist}`
          );
        }

        let watchlists;
        try {
          watchlists = await client.list(MAX_WATCHLISTS_SCANNED);
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          return errorResult(
            `Could not look up watchlists to resolve "${args.watchlist}": ${message}`
          );
        }
        const resolved = resolveWatchlistByName(args.watchlist, watchlists);
        if ('error' in resolved) {
          return errorResult(resolved.error);
        }
        linkArgs = { intent: 'watchlist_edit', watchlistId: resolved.id };
        break;
      }
    }

    const [coreStart] = await core.getStartServices();
    const url = buildUiLinkUrl(coreStart.http.basePath.serverBasePath, spaceId, linkArgs);

    logger.debug(`${ENTITY_ANALYTICS_UI_LINK_TOOL_ID} built link for intent '${linkArgs.intent}'`);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { url },
        },
      ],
    };
  },
});
