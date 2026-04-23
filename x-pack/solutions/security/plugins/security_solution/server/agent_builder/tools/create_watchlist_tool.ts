/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, StaticToolRegistration } from '@kbn/agent-builder-server';
import type { CoreSetup, Logger } from '@kbn/core/server';
import { generateEsql, executeEsql } from '@kbn/agent-builder-genai-utils';
import { getEntitiesAlias, ENTITY_LATEST } from '@kbn/entity-store/server';
import {
  SecurityAgentBuilderAttachments,
  SECURITY_WATCHLIST_ATTACHMENT_ID,
} from '../../../common/constants';
import type {
  SecuritySolutionPluginStart,
  SecuritySolutionPluginStartDependencies,
} from '../../plugin_contract';
import { securityTool } from './constants';
import { getAgentBuilderResourceAvailability } from '../utils/get_agent_builder_resource_availability';
import { WatchlistConfigClient } from '../../lib/entity_analytics/watchlists/management/watchlist_config';
import { WatchlistEntitySourceClient } from '../../lib/entity_analytics/watchlists/entity_sources/infra';

export const SECURITY_CREATE_WATCHLIST_TOOL_ID = securityTool('create_watchlist');

const createWatchlistSchema = z.object({
  user_query: z
    .string()
    .describe(
      'Natural language description of which entities to include in the watchlist, e.g. "users with the highest risk score" or "hosts with critical asset criticality and recent activity"'
    ),
  watchlist_name: z
    .string()
    .optional()
    .describe(
      'Name for the watchlist. If omitted, a name is derived from the query.'
    ),
  risk_modifier: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .describe(
      'Risk score modifier applied to entities in this watchlist (0.0–2.0). Defaults to 1.0 (no change).'
    ),
});

// Context injected into generateEsql so it knows entity store field semantics
const ENTITY_STORE_QUERY_CONTEXT = `
You are querying the Entity Store index. Key fields:
- entity.name (keyword): display name of the entity (username or hostname)
- entity.EngineMetadata.Type (keyword): entity type — 'user', 'host', 'service', or 'generic'
- entity.risk.calculated_score_norm (float): normalized risk score 0–100
- entity.risk.calculated_level (keyword): 'Unknown', 'Low', 'Moderate', 'High', or 'Critical'
- asset.criticality (keyword): 'low_impact', 'medium_impact', 'high_impact', 'extreme_impact'
- entity.lifecycle.first_seen (date): ISO timestamp of first observed activity
- entity.lifecycle.last_activity (date): ISO timestamp of most recent activity
- entity.attributes.watchlists (keyword[]): watchlist names the entity belongs to

Rules:
- ALWAYS include entity.name in the SELECT / KEEP clause
- Sort by entity.risk.calculated_score_norm DESC for risk-based queries unless told otherwise
- Default LIMIT to 50 unless the user specifies a different number
`;

const escapeKqlString = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildKqlFromEntityNames = (names: string[]): string => {
  const escaped = names.map((n) => `"${escapeKqlString(n)}"`).join(' OR ');
  return `entity.name: (${escaped})`;
};

const extractEntityNames = (
  columns: Array<{ name: string }>,
  values: unknown[][]
): string[] => {
  const colIdx = columns.findIndex((c) => c.name === 'entity.name');
  if (colIdx === -1) return [];
  return values
    .map((row) => row[colIdx])
    .filter((v): v is string => typeof v === 'string' && v.length > 0);
};

export function createWatchlistTool(
  core: CoreSetup<SecuritySolutionPluginStartDependencies, SecuritySolutionPluginStart>,
  logger: Logger
): StaticToolRegistration<typeof createWatchlistSchema> {
  const toolDefinition: BuiltinToolDefinition<typeof createWatchlistSchema> = {
    id: SECURITY_CREATE_WATCHLIST_TOOL_ID,
    type: ToolType.builtin,
    description: `Creates a security watchlist by:
1. Generating an ES|QL query from a natural language description
2. Executing it against the Entity Store to find matching entities
3. Creating a watchlist saved object with those entities as a live query-based entity source

The tool stores the result as an attachment. Use the returned attachmentId and version with <render_attachment id="..." version="..."> to display it.`,
    schema: createWatchlistSchema,
    tags: ['security', 'watchlist', 'entity-analytics'],
    availability: {
      cacheMode: 'space',
      handler: async ({ request }) =>
        getAgentBuilderResourceAvailability({ core, request, logger }),
    },
    handler: async (
      {
        user_query: userQuery,
        watchlist_name: watchlistName,
        risk_modifier: riskModifier = 1.0,
      },
      { esClient, modelProvider, request, events, attachments, spaceId }
    ) => {
      try {
        // ── Step 1: Generate ES|QL targeting the entity store ──────────────────
        const entityIndex = getEntitiesAlias(ENTITY_LATEST, spaceId);

        const model = await modelProvider.getDefaultModel();
        const esqlResponse = await generateEsql({
          model,
          logger,
          events,
          nlQuery: userQuery,
          esClient: esClient.asCurrentUser,
          index: entityIndex,
          additionalContext: ENTITY_STORE_QUERY_CONTEXT,
        });

        if (esqlResponse.error || !esqlResponse.query) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: { message: esqlResponse.error ?? 'Failed to generate ES|QL query' },
              },
            ],
          };
        }

        // ── Step 2: Execute the query against the Entity Store ─────────────────
        const { columns, values } = await executeEsql({
          query: esqlResponse.query,
          esClient: esClient.asCurrentUser,
        });

        const entityNames = extractEntityNames(columns, values);
        if (entityNames.length === 0) {
          return {
            results: [
              {
                type: ToolResultType.error,
                data: {
                  message:
                    'No matching entities found in the Entity Store for the given description.',
                  generatedQuery: esqlResponse.query,
                },
              },
            ],
          };
        }

        // ── Step 3: Build KQL rule and create watchlist ────────────────────────
        const kqlQueryRule = buildKqlFromEntityNames(entityNames);
        const resolvedName =
          watchlistName ?? `AI Watchlist: ${userQuery.slice(0, 60).trimEnd()}`;

        const [coreStart] = await core.getStartServices();
        const soClient = coreStart.savedObjects.getScopedClient(request);

        const watchlistClient = new WatchlistConfigClient({
          logger,
          namespace: spaceId,
          soClient,
          esClient: esClient.asCurrentUser,
        });

        const sourceClient = new WatchlistEntitySourceClient({
          soClient,
          namespace: spaceId,
        });

        const watchlist = await watchlistClient.create({
          name: resolvedName,
          description: `AI-generated watchlist. Original query: "${userQuery}"`,
          riskModifier,
          managed: false,
        });

        if (!watchlist.id) {
          throw new Error('Watchlist created but no ID returned');
        }

        const entitySource = await sourceClient.create({
          type: 'store',
          name: `${resolvedName} — entity source`,
          queryRule: kqlQueryRule,
          enabled: true,
        });

        await watchlistClient.addEntitySourceReference(watchlist.id, entitySource.id);

        const result = {
          ...watchlist,
          entityCount: entityNames.length,
          entityNames,
          generatedEsql: esqlResponse.query,
        };

        // ── Step 4: Persist as attachment ──────────────────────────────────────
        const created = await attachments.add({
          id: SECURITY_WATCHLIST_ATTACHMENT_ID,
          type: SecurityAgentBuilderAttachments.watchlist,
          data: {
            text: JSON.stringify(result),
            attachmentLabel: resolvedName,
          },
          description: `Watchlist: ${resolvedName}`,
        });

        return {
          results: [
            {
              type: ToolResultType.other,
              data: {
                success: true,
                watchlistId: watchlist.id,
                watchlistName: resolvedName,
                entityCount: entityNames.length,
                attachmentId: created.id,
                version: created.current_version,
              },
            },
          ],
        };
      } catch (error) {
        logger.error(
          `${SECURITY_CREATE_WATCHLIST_TOOL_ID} failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        return {
          results: [
            {
              type: ToolResultType.error,
              data: {
                message: `Failed to create watchlist: ${
                  error instanceof Error ? error.message : String(error)
                }`,
              },
            },
          ],
        };
      }
    },
  };

  return toolDefinition;
}
