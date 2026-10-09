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
import { WATCHLIST_IDENTIFIER_FIELDS } from '../../../../../common/entity_analytics/watchlists/constants';
import type { MonitoringEntitySource } from '../../../../../common/api/entity_analytics/watchlists/data_source/common.gen';
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
  previewStoreSource,
  formatStorePreviewMessage,
  previewIndexSource,
  formatIndexPreviewMessage,
  formatRuleBasedSourceParamLines,
  toDataSourceSummary,
  fingerprintDataSource,
  DATA_SOURCE_CHANGED_MESSAGE,
  type ConfirmedDataSourceState,
} from './data_source_utils';

const DEFAULT_RANGE = { start: 'now-10d', end: 'now' };

const baseSchema = z.object({
  watchlistId: z
    .string()
    .min(1)
    .describe(
      'The id of the watchlist to attach the rule-based data source to. Use `security.get_watchlist_id` to resolve a watchlist name to its id first when the user named the watchlist.'
    ),
  queryRule: z
    .string()
    .min(1)
    .max(4096)
    .describe(
      'KQL filter query. Matches are added to the watchlist automatically, and re-evaluated on a schedule (about every 10 minutes) — entities/documents that stop matching are removed. For `store` sources, this queries the entity store directly, which holds every entity type (`user`, `host`, `service`, `generic`) in one index — a query with no entity-type clause matches across all of them, so if the user\'s request implies a specific type (e.g. "critical-risk users", "Ubuntu hosts"), add an `entity.EngineMetadata.Type: "user"` / `"host"` / `"service"` / `"generic"` clause (same field and values `security.search_entities`\' `entityTypes` filters on) — do NOT use `entity.type` for this, its value is an inconsistent per-source fallback (e.g. `"Identity"` for users, not `"user"`) and can be missing entirely. Example: `entity.risk.calculated_level: "Critical" and entity.EngineMetadata.Type: "user"`. For `index` sources, this queries the target `indexPattern` instead (e.g. raw Okta logs) using that index\'s own fields (e.g. `event.action: "user.session.start"`) — the entity type is implied by `identifierField` there, so an entity-type clause does not apply. In both cases, only write a clause for a condition the user named concretely (a real field, or a value they gave/confirmed) — if they described the condition only in human/conceptual terms (e.g. "contract terminated", "flagged as risky") without saying which field or value means that, ask them what field/value to filter on; do not invent one, since a plausible-sounding guess can silently match nothing or the wrong entities.'
    ),
});

const rangeSchema = z.object({
  start: z.string().min(1).max(256).describe('Lookback start, e.g. "now-10d".'),
  end: z.string().min(1).max(256).describe('Lookback end, e.g. "now".'),
});
const indexPatternSchema = z.object({
  indexPattern: z
    .string()
    .min(1)
    .max(1000)
    .describe(
      'Required when `type` is `index`. Index pattern to correlate against (e.g. "logs-okta.system-*"). Must be a concrete index pattern — if the user only described the source conceptually (e.g. "our HR index", "the vulnerability scanner data") without naming the actual pattern, ask them for it; do not guess one.'
    ),
  identifierField: z
    .enum(WATCHLIST_IDENTIFIER_FIELDS)
    .describe(
      'Required when `type` is `index`. Field used both to scan the entity store (stage 1) and to aggregate matches on the target index (stage 2) — same field name on both sides, hence the fixed list. Pick based on the entity type the watchlist tracks: `host.name`/`host.id` for hosts, `user.name`/`user.email` for users, `service.name` for services.'
    ),
  range: rangeSchema.describe(
    'Only used when `type` is `index`. Lookback window applied to the target index. Defaults to the last 10 days.'
  ),
});

const schema = baseSchema
  .extend(indexPatternSchema.partial().shape)
  .extend({
    type: z
      .enum(RULE_BASED_SOURCE_TYPES)
      .describe(
        'Which kind of rule-based data source. `store` (Entity Store): query the entity store directly — use when the desired field is already a collected attribute on the entity (e.g. `host.os.name`). Requires no index pattern, identifier field, or API key. `index` (Index Pattern): correlate a user-owned index against the entity store — use when the matching evidence lives in raw logs (e.g. an okta event index). Only identities already present in the entity store can match; it filters existing entities using external evidence, it does not discover new ones.'
      ),
  })
  .superRefine((data, ctx) => {
    if (data.type !== RuleBasedSourceType.index) return;
    if (!data.indexPattern) {
      ctx.addIssue({
        code: 'custom',
        path: ['indexPattern'],
        message: 'indexPattern is required when type is "index".',
      });
    }
    if (!data.identifierField) {
      ctx.addIssue({
        code: 'custom',
        path: ['identifierField'],
        message: 'identifierField is required when type is "index".',
      });
    }
  });

export const SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID = securityTool(
  'set_watchlist_rule_based_data_source'
);

type SchemaInput = z.infer<typeof schema>;
type BaseSourceInput = z.infer<typeof baseSchema>;

type StoreSourceInput = BaseSourceInput & {
  type: typeof RuleBasedSourceType.store;
};
type IndexSourceInput = BaseSourceInput &
  z.infer<typeof indexPatternSchema> & {
    type: typeof RuleBasedSourceType.index;
  };
type SourceInput = StoreSourceInput | IndexSourceInput;

/**
 * Re-validates and narrows the flat schema input into a discriminated shape. The
 * `indexPattern`/`identifierField` requirement is already enforced by the schema's
 * `superRefine`; this just gives the handler proper TS narrowing without a `!` assertion.
 */
const parseParams = (input: SchemaInput): SourceInput | { error: string } => {
  if (input.type === RuleBasedSourceType.store) {
    return {
      type: RuleBasedSourceType.store,
      watchlistId: input.watchlistId,
      queryRule: input.queryRule,
    };
  }
  if (!input.indexPattern || !input.identifierField) {
    return { error: 'indexPattern and identifierField are required when type is "index".' };
  }
  return {
    type: RuleBasedSourceType.index,
    watchlistId: input.watchlistId,
    queryRule: input.queryRule,
    indexPattern: input.indexPattern,
    identifierField: input.identifierField,
    range: input.range ?? DEFAULT_RANGE,
  };
};

const buildSourceName = (watchlistId: string, type: RuleBasedSourceType): string =>
  `${watchlistId}-${type}`;

export const setWatchlistRuleBasedDataSourceTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures,
  hasEncryptionKey: boolean
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
    type: ToolType.builtin,
    description: `Create or update the rule-based data source that keeps a watchlist's membership in sync automatically — the entities matching its filter query are added within about 10 minutes of any change, and entities that stop matching are removed. Requires user confirmation, which includes a preview of what the query currently matches.

Use when the user wants ongoing/continuous membership (e.g. "keep adding Ubuntu hosts to this watchlist as they appear", "make sure new okta admins always land on this watchlist") — NOT for a one-time add, which is \`security.add_entities_to_watchlist\`.

Each watchlist supports one \`store\` source and, separately, one \`index\` source (a managed watchlist may hold both alongside its locked integration sources; a non-managed watchlist only has room for one — creating the *other* type there **removes** the existing one, it does not add a second). Calling this again with the same \`type\` on a watchlist that already has one **replaces** it — this is an upsert, not an add. Call \`security.list_watchlist_data_sources\` first if you need to know whether a source of that type already exists before describing the change to the user.

Resolve the watchlist id via \`security.get_watchlist_id\` first when the user named the watchlist. A managed source of the same type cannot be replaced from chat — the tool returns an error naming what owns it (e.g. an integration).`,
    schema,
    tags: ['security', 'entity-analytics', 'watchlists'],
    annotations: {
      title: 'Set Watchlist Rule-Based Data Source',
      readOnlyHint: false,
      destructiveHint: false,
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
        `${SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID} tool called with parameters ${JSON.stringify(
          params
        )}`
      );

      const telemetryTracker = createToolTelemetryTracker({
        core,
        toolId: SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
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
        const source = parseParams(params);
        if ('error' in source) {
          return errorResult(source.error);
        }

        if (source.type === RuleBasedSourceType.index && !hasEncryptionKey) {
          return errorResult(
            'Index-type entity sources require encrypted saved objects. Use a `store` source instead, or ask an administrator to configure encryption.'
          );
        }

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

        // The watchlist-entity-source saved-object type is registered as hidden=true; a plain
        // getScopedClient(request) cannot see it, so we must opt in explicitly.
        const soClient = coreStart.savedObjects.getScopedClient(request, {
          includedHiddenTypes: [watchlistEntitySourceTypeName],
        });

        const watchlistClient = new WatchlistConfigClient({
          soClient,
          esClient: esClient.asCurrentUser,
          namespace: spaceId,
          logger,
        });
        const watchlist = await watchlistClient.get(source.watchlistId);

        const entitySourceClient = new WatchlistEntitySourceClient({
          soClient,
          namespace: spaceId,
          esClient: esClient.asCurrentUser,
          getStartServices: core.getStartServices,
          logger,
          hasEncryptionKey,
        });

        const existingSourceIds = await watchlistClient.getEntitySourceIds(source.watchlistId);
        const linkedSources = existingSourceIds.length
          ? (
              await entitySourceClient.list(
                { per_page: existingSourceIds.length },
                existingSourceIds
              )
            ).sources
          : [];
        const existingSource = linkedSources.find((linked) => linked.type === source.type);
        const toUpdate = !!existingSource;

        if (existingSource?.managed) {
          return errorResult(
            `Entity source of type "${source.type}" ("${existingSource.name}") is managed. Managed sources cannot be replaced from chat.`
          );
        }

        // A non-managed watchlist has room for exactly one rule-based source; the UI editor
        // only ever reads the first linked source for one, so a second one linked here would
        // sync members the user has no way to see or manage from the UI. Managed watchlists
        // can hold another rule-based source type alongside locked integration sources
        const conflictingType =
          source.type === RuleBasedSourceType.store
            ? RuleBasedSourceType.index
            : RuleBasedSourceType.store;
        const conflictingSource =
          !watchlist.managed && !toUpdate
            ? linkedSources.find((linked) => linked.type === conflictingType)
            : undefined;
        const willReplaceConflictingSource = !!conflictingSource;

        if (conflictingSource?.managed) {
          return errorResult(
            `Watchlist "${
              watchlist.name
            }" is non-managed and already has a managed **${getRuleTypeNames(
              conflictingType
            )}** source. Managed sources cannot be replaced.`
          );
        }

        const promptId = `watchlists.set_watchlist_rule_based_data_source.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);
        telemetryTracker.recordConfirmationStatus(status);

        if (status === ConfirmationStatus.unprompted) {
          let previewMessage = '';
          try {
            if (source.type === RuleBasedSourceType.store) {
              const preview = await previewStoreSource({
                esClient: esClient.asCurrentUser,
                namespace: spaceId,
                queryRule: source.queryRule,
              });
              previewMessage = formatStorePreviewMessage(preview.total);
            } else {
              const range = source.range ?? DEFAULT_RANGE;
              const preview = await previewIndexSource({
                esClient: esClient.asCurrentUser,
                indexPattern: source.indexPattern,
                identifierField: source.identifierField,
                queryRule: source.queryRule,
                range,
              });
              previewMessage = formatIndexPreviewMessage(preview, {
                identifierField: source.identifierField,
                range,
              });
            }
          } catch (previewError) {
            const previewErrorMessage =
              previewError instanceof Error ? previewError.message : 'Unknown error';
            return errorResult(
              `Could not evaluate the query to build a preview: ${previewErrorMessage}. Fix the query and try again.`
            );
          }

          const action = toUpdate ? 'Update' : 'Create';
          const willReEnable = existingSource?.enabled === false;

          const lines = [
            `${action} the **${getRuleTypeNames(
              source.type
            )}** rule-based data source for watchlist **"${watchlist.name}"**?`,
            '',
            ...formatRuleBasedSourceParamLines(source.type, source, existingSource),
            ...(willReEnable
              ? [
                  '',
                  'This source is currently **disabled** — saving this change will re-enable it.',
                ]
              : []),
            ...(willReplaceConflictingSource
              ? [
                  '',
                  `This watchlist can only have one rule-based source — saving this will remove its existing **${getRuleTypeNames(
                    conflictingType
                  )}** source.`,
                ]
              : []),
            '',
            previewMessage,
          ];
          telemetryTracker.recordAwaitingConfirmation();
          stateManager.setState<ConfirmedDataSourceState>({
            existingSourceFingerprint: fingerprintDataSource(existingSource),
            conflictingSourceId: conflictingSource?.id ?? null,
          });
          return prompts.askForConfirmation({
            id: promptId,
            title: `${action} rule-based data source`,
            message: lines.join('\n'),
            confirm_text: action,
            cancel_text: 'Cancel',
            color: 'primary',
          });
        }

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: { message: "User declined to set the watchlist's rule-based data source." },
              },
            ],
          };
        }

        // The prompt showed the user a specific current → new change (and, when applicable, a
        // specific conflicting source it would remove). Refuse to apply it if either moved
        // underneath us while the confirmation was open.
        const approvedState = stateManager.getState<ConfirmedDataSourceState>();
        if (
          !approvedState ||
          approvedState.existingSourceFingerprint !== fingerprintDataSource(existingSource) ||
          (approvedState.conflictingSourceId ?? null) !== (conflictingSource?.id ?? null)
        ) {
          return errorResult(DATA_SOURCE_CHANGED_MESSAGE);
        }

        // Add the data source to the watchlist and trigger a background sync
        const attributes: Partial<MonitoringEntitySource> =
          source.type === RuleBasedSourceType.store
            ? {
                type: RuleBasedSourceType.store,
                name:
                  existingSource?.name ??
                  buildSourceName(source.watchlistId, RuleBasedSourceType.store),
                queryRule: source.queryRule,
                enabled: true,
              }
            : {
                type: RuleBasedSourceType.index,
                name:
                  existingSource?.name ??
                  buildSourceName(source.watchlistId, RuleBasedSourceType.index),
                queryRule: source.queryRule,
                indexPattern: source.indexPattern,
                identifierField: source.identifierField,
                range: source.range ?? DEFAULT_RANGE,
                enabled: true,
              };

        const savedSource = toUpdate
          ? await entitySourceClient.update({ ...attributes, id: existingSource.id }, request)
          : await entitySourceClient.create(attributes, request);

        if (!toUpdate) {
          try {
            await watchlistClient.addEntitySourceReference(source.watchlistId, savedSource.id);
          } catch (linkError) {
            // The source (and its API key, for `index` type) was already persisted by `create`.
            // Roll it back so a failed link doesn't leave an orphaned, unlinked source/credential behind
            await entitySourceClient.delete(savedSource.id).catch((cleanupError) => {
              logger.error(
                `Failed to roll back orphaned entity source "${
                  savedSource.id
                }" after a link failure: ${
                  cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
                }`
              );
            });
            throw linkError;
          }
        }

        // Enforce the one-rule-based-source invariant for non-managed watchlists.
        if (willReplaceConflictingSource && conflictingSource) {
          await entitySourceClient.delete(conflictingSource.id);
          try {
            await watchlistClient.removeEntitySourceReference(
              source.watchlistId,
              conflictingSource
            );
          } catch (unlinkError) {
            logger.error(
              `Failed to unlink already-deleted conflicting entity source "${
                conflictingSource.id
              }" from watchlist "${source.watchlistId}": ${
                unlinkError instanceof Error ? unlinkError.message : 'Unknown error'
              }`
            );
          }
        }

        void syncWatchlistInBackground({
          watchlistId: source.watchlistId,
          logContext: SECURITY_SET_WATCHLIST_RULE_BASED_DATA_SOURCE_TOOL_ID,
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
                watchlistId: source.watchlistId,
                watchlistName: watchlist.name,
                action: existingSource ? 'updated' : 'created',
                source: toDataSourceSummary(savedSource),
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
              data: { message: `Error setting watchlist rule-based data source: ${errorMessage}` },
            },
          ],
        };
      } finally {
        await telemetryTracker.report();
      }
    },
  };
};

function getRuleTypeNames(type: RuleBasedSourceType): string {
  return type === RuleBasedSourceType.store ? 'Entity Store' : 'Index Pattern';
}
