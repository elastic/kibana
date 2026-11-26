/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type { ExperimentalFeatures } from '../../../../../common';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../../plugin_contract';
import { WatchlistConfigClient } from '../../../../lib/entity_analytics/watchlists/management/watchlist_config';
import { syncWatchlistInBackground } from '../../../../lib/entity_analytics/watchlists/entity_sources/entity_sources_service';
import {
  RULE_BASED_SOURCE_TYPES,
  RuleBasedSourceType,
  WatchlistEntitySourceClient,
  watchlistEntitySourceTypeName,
} from '../../../../lib/entity_analytics/watchlists/entity_sources/infra';
import { createToolTelemetryTracker } from '../tool_telemetry_tracker';
import { securityTool } from '../../constants';
import { checkWatchlistAccess } from './check_watchlist_access';
import { getWatchlistToolAvailability } from './watchlist_availability';
import {
  fingerprintDataSource,
  formatRuleBasedSourceParamLines,
  DATA_SOURCE_CHANGED_MESSAGE,
  type ConfirmedDataSourceState,
} from './data_source_utils';

const schema = z.object({
  watchlistId: z
    .string()
    .min(1)
    .describe(
      'The id of the watchlist to remove the rule-based data source from. Use `security.get_watchlist_id` to resolve a watchlist name to its id first when the user named the watchlist.'
    ),
  type: z
    .enum(RULE_BASED_SOURCE_TYPES)
    .describe(
      'Which rule-based data source to remove — `store` (entity-store query) or `index` (index correlation). A watchlist may have one of each; pass the one the user means. Use `security.list_watchlist_data_sources` first if unsure which exist.'
    ),
});

export const SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID = securityTool(
  'remove_watchlist_rule_based_data_source'
);

export const removeWatchlistRuleBasedDataSourceTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  hasEncryptionKey: boolean
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
    type: ToolType.builtin,
    description: `Remove the rule-based data source of a given type from a watchlist, stopping automatic membership sync for that source. Requires user confirmation before removal. Mirrors the UI's "None" toggle for that source type.

Use when the user wants to stop a watchlist from automatically tracking entities matching a query (e.g. "stop auto-adding Ubuntu hosts to this watchlist"). This does NOT remove entities that are already on the watchlist manually or via other sources — use \`security.remove_entities_from_watchlist\` for manual removals.

Resolve the watchlist id via \`security.get_watchlist_id\` first when the user named the watchlist. If the source of that type is managed (owned by an integration like okta or ad), the tool returns an error — managed sources cannot currently be removed.`,
    schema,
    tags: ['security', 'entity-analytics', 'watchlists'],
    annotations: {
      title: 'Remove Watchlist Rule-Based Data Source',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    availability: {
      cacheMode: 'space',
      handler: ({ request }) =>
        getWatchlistToolAvailability({
          core,
          request,
          logger,
          experimentalFeatures,
          requireEntityStoreV2: true,
        }),
    },
    handler: async (params, { spaceId, esClient, request, prompts, callContext, stateManager }) => {
      logger.debug(
        `${SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
        spaceId,
        actionType: 'mutation',
      });

      const errorResult = (message: string) => {
        telemetryTracker.recordFailure(message);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message },
            },
          ],
        };
      };

      try {
        const [coreStart, startPlugins] = await core.getStartServices();
        const { security } = startPlugins;

        const accessResult = await checkWatchlistAccess({
          request,
          security,
          spaceId,
          type: 'write',
          action: 'configure watchlist entity sources',
        });
        if (!accessResult.allowed) {
          telemetryTracker.recordFailure(accessResult.result.data.message);
          return { results: [accessResult.result] };
        }

        const soClient = coreStart.savedObjects.getScopedClient(request, {
          includedHiddenTypes: [watchlistEntitySourceTypeName],
        });

        const watchlistClient = new WatchlistConfigClient({
          soClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        });
        const watchlist = await watchlistClient.get(params.watchlistId);

        const entitySourceClient = new WatchlistEntitySourceClient({
          soClient,
          namespace: spaceId,
          esClient: esClient.asCurrentUser,
          getStartServices: core.getStartServices,
          logger,
          hasEncryptionKey,
        });

        // 1. Get the existing data sources
        const existingSourceIds = await watchlistClient.getEntitySourceIds(params.watchlistId);
        const linkedSources = existingSourceIds.length
          ? (
              await entitySourceClient.list(
                { per_page: existingSourceIds.length },
                existingSourceIds
              )
            ).sources
          : [];
        const existingSource = linkedSources.find((source) => source.type === params.type);

        // 2. If no data source of the given type is found, there is nothing to remove
        if (!existingSource) {
          const otherType =
            params.type === RuleBasedSourceType.store
              ? RuleBasedSourceType.index
              : RuleBasedSourceType.store;
          const hasOtherType = linkedSources.some((source) => source.type === otherType);
          const otherTypeMessage = hasOtherType
            ? ` This watchlist has ${
                otherType === RuleBasedSourceType.index ? 'an' : 'a'
              } ${otherType} source instead.`
            : '';
          return errorResult(
            `Watchlist "${watchlist.name}" does not have a ${params.type} rule-based data source to remove.${otherTypeMessage}`
          );
        }

        // 3. If the data source is managed, it cannot be removed
        if (existingSource.managed) {
          return errorResult(
            `The ${params.type} entity source on watchlist "${watchlist.name}" ("${existingSource.name}") is managed and cannot currently be removed.`
          );
        }

        const promptId = `watchlists.remove_watchlist_rule_based_data_source.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.unprompted) {
          telemetryTracker.recordAwaitingConfirmation();
          stateManager.setState<ConfirmedDataSourceState>({
            existingSourceFingerprint: fingerprintDataSource(existingSource),
          });
          const ruleType =
            params.type === RuleBasedSourceType.store ? 'Entity Store' : 'Index Pattern';
          return prompts.askForConfirmation({
            id: promptId,
            title: 'Remove rule-based data source',
            message: [
              `Remove the **${ruleType}** rule-based data source from watchlist **"${watchlist.name}"**?`,
              ...formatRuleBasedSourceParamLines(params.type, {
                ...existingSource,
                queryRule: existingSource.queryRule ?? '',
              }),
              '',
              'Entities that were added by this query will be automatically removed from the watchlist on the next sync. This does not affect entities added manually or via other sources.',
            ].join('\n'),
            confirm_text: 'Remove',
            cancel_text: 'Cancel',
            color: 'warning',
          });
        }

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: "User declined to remove the watchlist's rule-based data source.",
                },
              },
            ],
          };
        }

        // The prompt named a specific source and query. Refuse to delete anything else if the
        // source was edited or replaced while the confirmation was open.
        const approvedState = stateManager.getState<ConfirmedDataSourceState>();
        if (
          !approvedState ||
          approvedState.existingSourceFingerprint !== fingerprintDataSource(existingSource)
        ) {
          return errorResult(DATA_SOURCE_CHANGED_MESSAGE);
        }

        // 4. Actual action: remove the data source
        // Delete before unlinking — if unlinking fails, the leftover reference just points to an already-deleted source
        // instead of leaving the source and its credential (for `index` type) orphaned but still live and no longer discoverable to retry or revoke.
        await entitySourceClient.delete(existingSource.id);
        await watchlistClient.removeEntitySourceReference(params.watchlistId, existingSource);

        void syncWatchlistInBackground({
          watchlistId: params.watchlistId,
          logContext: SECURITY_REMOVE_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
          esClient: esClient.asCurrentUser,
          soClient,
          logger,
          namespace: spaceId,
          getStartServices: core.getStartServices,
          hasEncryptionKey,
        });

        telemetryTracker.recordResultCount(1);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.other,
              data: {
                watchlistId: params.watchlistId,
                watchlistName: watchlist.name,
                removedSourceId: existingSource.id,
                type: params.type,
              },
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        telemetryTracker.recordFailure(errorMessage);
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error removing watchlist rule-based data source: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};
