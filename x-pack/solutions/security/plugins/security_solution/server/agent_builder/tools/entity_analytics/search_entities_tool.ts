/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition, ToolAvailabilityContext } from '@kbn/agent-builder-server';
import { getToolResultId } from '@kbn/agent-builder-server/tools';
import { executeEsql } from '@kbn/agent-builder-genai-utils';
import {
  getHistorySnapshotIndexPattern,
  getEntitiesAlias,
  ENTITY_LATEST,
} from '@kbn/entity-store/server';
import type { Logger } from '@kbn/logging';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import {
  IdentifierType,
  EntityRiskLevels,
} from '../../../../common/api/entity_analytics/common/common.gen';
import type { ExperimentalFeatures } from '../../../../common';
import { AssetCriticalityLevel } from '../../../../common/api/entity_analytics/asset_criticality/common.gen';
import type { SecuritySolutionPluginCoreSetupDependencies } from '../../../plugin_contract';
import { getAgentBuilderResourceAvailability } from '../../utils/get_agent_builder_resource_availability';
import { ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT } from '../../../lib/telemetry/event_based/events';
import { securityTool } from '../constants';
import {
  buildListEntityAttachmentId,
  buildRenderAttachmentTag,
  buildSingleEntityAttachmentId,
  describeAttachmentForRow,
  ensureEntityAttachment,
  type EntityAttachmentDescriptor,
} from './entity_attachment_utils';

const ENTITY_STORE_KEEP_FIELDS = [
  '@timestamp',
  'entity.id',
  'entity.name',
  'entity.EngineMetadata.Type',
  'entity.risk.calculated_score_norm',
  'entity.risk.calculated_level',
  'asset.criticality',
  'entity.source',
  'entity.lifecycle.first_seen',
  'entity.lifecycle.last_activity',
  'entity.attributes.watchlists',
  'entity.attributes.managed',
  'entity.attributes.mfa_enabled',
  'entity.attributes.asset',
  'entity.behaviors.rule_names',
  'entity.behaviors.anomaly_job_ids',
] as const;

const MINUTES_PER_DAY = 1440;

const intervalToMinutes = (interval: string): number => {
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (match == null) throw new Error(`Invalid interval format: ${interval}`);
  const [, value, unit] = match;
  const minutesMap: Record<string, number> = {
    s: 1 / 60,
    m: 1,
    h: 60,
    d: 1440,
    w: 10080,
    M: 43200,
  };
  return Number(value) * minutesMap[unit];
};

const schema = z.object({
  entityTypes: z
    .array(IdentifierType)
    .optional()
    .describe('Filter by entity type(s): host, user, service, or generic.'),
  riskScoreChangeInterval: z
    .string()
    .regex(
      /^\d+[smhdwM]$/,
      `Intervals should follow {value}{unit} where unit is one of s,m,h,d,w,M`
    )
    .refine(
      (val) => {
        try {
          return intervalToMinutes(val) >= MINUTES_PER_DAY;
        } catch {
          return false;
        }
      },
      {
        message: 'riskScoreChangeInterval must be at least 1 day (e.g. "1d", "1w", "1M")',
      }
    )
    .describe(
      `The time interval to search for risk score changes (e.g. '30d', '7d', '1w'). Must be at least 1 day. Intervals should be in format {value}{unit} where value is a number and unit is one of 'd' (day), 'w' (week), or 'M' (month)`
    )
    .optional(),
  riskScoreMin: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Minimum normalized risk score (1-100). When >0, only returns entities with entity.risk.calculated_score_norm >= this value. ' +
        'Pass 0 or omit this parameter to apply no lower bound. ' +
        'Note: the default sort is "riskScore", which by itself already excludes entities whose score is NULL — ' +
        'if the user wants unscored entities alongside scored ones, use sortBy: "criticality" instead of lowering riskScoreMin. ' +
        'Only set a positive floor when the user explicitly asked for a score threshold (e.g. "above 70").'
    ),
  riskScoreMax: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .describe(
      'Maximum normalized risk score (0-100). Only returns entities with entity.risk.calculated_score_norm <= this value.'
    ),
  riskLevels: z
    .array(EntityRiskLevels)
    .optional()
    .describe('Filter by risk level(s). Valid values: Unknown, Low, Moderate, High, Critical.'),
  criticalityLevels: z
    .array(AssetCriticalityLevel)
    .optional()
    .describe(
      'Filter by asset criticality level(s). Valid values: low_impact, medium_impact, high_impact, extreme_impact.'
    ),
  watchlists: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Filter for entities that belong to any of the specified watchlists (entity.attributes.watchlists).'
    ),
  sources: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Filter for entities whose multi-value `entity.source` field matches ANY of the given values either exactly ' +
        'or as a "<value>.*" prefix. For example `sources: ["aws"]` matches entities with `entity.source` of ' +
        '"aws", "aws.cloudtrail", "aws.guardduty", "aws.s3access", etc. Values are the raw lowercase integration ' +
        'keys from the entity store (e.g. "crowdstrike", "okta", "entityanalytics_okta", "island_browser") — do ' +
        'not pretty-print (pass "island_browser", not "Island Browser"). For user entities prefer the normalized ' +
        '`namespaces` parameter when possible; fall back to `sources` when no canonical namespace exists or when ' +
        'searching host/service/generic entities.'
    ),
  namespaces: z
    .array(z.string().min(1))
    .optional()
    .describe(
      'Filter user entities by normalized vendor namespace (`entity.namespace`). This is single-value and ' +
        'collapses heterogeneous source keys into canonical names. Known canonical values: "okta" (from okta / ' +
        'entityanalytics_okta), "entra_id" (from azure / entityanalytics_entra_id), "microsoft_365" (from o365 / ' +
        'o365_metrics), "active_directory" (from entityanalytics_ad), "local" (non-IDP endpoint/system accounts), ' +
        '"unknown" (missing source), plus pass-through of `event.module` for vendors without a dedicated mapping ' +
        '(e.g. "aws", "gcp"). Only effective on user entities; host/service/generic rows do not have ' +
        '`entity.namespace` and will be filtered out when this parameter is set.'
    ),
  managedOnly: z
    .boolean()
    .optional()
    .describe('When true, only returns managed entities (entity.attributes.managed == true).'),
  mfaEnabledOnly: z
    .boolean()
    .optional()
    .describe(
      'When true, only returns entities with MFA enabled (entity.attributes.mfa_enabled == true).'
    ),
  assetOnly: z
    .boolean()
    .optional()
    .describe(
      'When true, only returns entities that are assets (entity.attributes.asset == true).'
    ),
  firstSeenAfter: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities first seen after a certain date. Date must be in ISO 8601 datetime format.'
    ),
  firstSeenBefore: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities first seen before a certain date. Date must be in ISO 8601 datetime format.'
    ),
  lastSeenAfter: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities last seen after a certain date. Date must be in ISO 8601 datetime format.'
    ),
  lastSeenBefore: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/,
      'Date must be in ISO 8601 format (e.g. "2024-01-15T12:00:00Z")'
    )
    .optional()
    .describe(
      'Filter for entities last seen before a certain date. Date must be in ISO 8601 datetime format.'
    ),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe('Maximum number of entities to return (1-100, default 10).'),
  sortBy: z
    .enum(['riskScore', 'criticality'])
    .optional()
    .describe(
      'Field to order results by (always DESC). Defaults to "riskScore" (entity.risk.calculated_score_norm). ' +
        'Sorting by "riskScore" (default or explicit) implicitly excludes entities whose ' +
        'entity.risk.calculated_score_norm IS NULL — ranking is not meaningful for unscored entities. ' +
        'Use sortBy: "criticality" if you need unscored entities to appear (their criticality_rank defaults to 0 so they land last). ' +
        'Use "criticality" when the user explicitly asks to order, rank, sort, or list top-N entities BY criticality ' +
        '(extreme_impact > high_impact > medium_impact > low_impact; entities with no asset.criticality land last; ' +
        'risk score is the tiebreaker within a tier). ' +
        'Do NOT pass all four criticalityLevels to simulate a sort — that is a no-op filter. ' +
        'Ignored when riskScoreChangeInterval is set (that flow always sorts by risk_score_change DESC).'
    ),
});
type ToolParams = z.infer<typeof schema>;

export const SECURITY_SEARCH_ENTITIES_TOOL_ID = securityTool('search_entities');

const SENTINEL_LOWER_BOUND_CUTOFF_MS = Date.parse('2000-01-01T00:00:00Z');

const parseIsoMs = (value: string | undefined): number | null => {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const isVacuousLowerBound = (value: string | undefined): boolean => {
  const ms = parseIsoMs(value);
  return ms !== null && ms <= SENTINEL_LOWER_BOUND_CUTOFF_MS;
};

const isVacuousUpperBound = (value: string | undefined, nowMs: number): boolean => {
  const ms = parseIsoMs(value);
  return ms !== null && ms > nowMs;
};

/**
 * Silently sanitises a handful of "over-fill" patterns that some LLMs (most notably
 * ChatGPT-class models) produce on the wire. Without this, perfectly reasonable user
 * intent (e.g. "top 5 users by criticality") gets turned into a different query or
 * silently filtered out because ES|QL comparisons against NULL are false. We would
 * rather drop the problematic parameter than reject the call and force the model
 * into a rejection loop.
 */
const normalizeParams = (params: ToolParams, logger: Logger): ToolParams => {
  const dropped: string[] = [];
  const out: ToolParams = { ...params };

  if (out.sortBy && out.riskScoreChangeInterval) {
    dropped.push('riskScoreChangeInterval');
    out.riskScoreChangeInterval = undefined;
  }

  if (out.riskScoreMax !== undefined && out.riskScoreMax >= 100) {
    dropped.push('riskScoreMax');
    out.riskScoreMax = undefined;
  }

  // Treat "epoch-style" lower bounds and any strictly-future upper bound as
  // sentinels. These restrict nothing for populated rows but, because ES|QL
  // evaluates any NULL comparison to NULL (falsy in WHERE), silently drop
  // entities whose lifecycle timestamps are not populated. Prune per field so
  // mixed genuine/sentinel inputs keep the legitimate half.
  const nowMs = Date.now();

  if (isVacuousLowerBound(out.firstSeenAfter)) {
    dropped.push('firstSeenAfter');
    out.firstSeenAfter = undefined;
  }
  if (isVacuousUpperBound(out.firstSeenBefore, nowMs)) {
    dropped.push('firstSeenBefore');
    out.firstSeenBefore = undefined;
  }
  if (isVacuousLowerBound(out.lastSeenAfter)) {
    dropped.push('lastSeenAfter');
    out.lastSeenAfter = undefined;
  }
  if (isVacuousUpperBound(out.lastSeenBefore, nowMs)) {
    dropped.push('lastSeenBefore');
    out.lastSeenBefore = undefined;
  }

  if (out.firstSeenAfter && out.firstSeenBefore && out.firstSeenAfter === out.firstSeenBefore) {
    dropped.push('firstSeenAfter', 'firstSeenBefore');
    out.firstSeenAfter = undefined;
    out.firstSeenBefore = undefined;
  }

  if (out.lastSeenAfter && out.lastSeenBefore && out.lastSeenAfter === out.lastSeenBefore) {
    dropped.push('lastSeenAfter', 'lastSeenBefore');
    out.lastSeenAfter = undefined;
    out.lastSeenBefore = undefined;
  }

  if (dropped.length > 0) {
    logger.debug(
      `${SECURITY_SEARCH_ENTITIES_TOOL_ID} normalized over-filled params; dropped: ${dropped.join(
        ', '
      )}`
    );
  }

  return out;
};

const escapeEsqlString = (value: string) => value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

const buildInListClause = (field: string, values: string[]): string => {
  const escaped = values.map((v) => `"${escapeEsqlString(v)}"`).join(', ');
  return `${field} IN (${escaped})`;
};

const buildMvContainsClause = (field: string, values: string[]): string =>
  values.map((v) => `MV_CONTAINS(${field}, "${escapeEsqlString(v)}")`).join(' OR ');

/**
 * Builds a WHERE clause fragment matching `entity.source` against any of the given values
 * either exactly or as a "<value>.*" prefix. `entity.source` is multi-valued and may carry
 * vendor keys (`"aws"`), dataset keys (`"aws.cloudtrail"`), or integration keys
 * (`"entityanalytics_okta"`), so exact-only matching misses dataset-shaped variants. ESQL
 * `LIKE` on a multi-value keyword field returns true if ANY value matches the pattern, and
 * we anchor the prefix with a trailing `.` to avoid false positives on unrelated prefixes
 * (e.g. `"awsome_*"` will not match `sources: ["aws"]`).
 */
const buildSourceMatchClause = (values: string[]): string =>
  values
    .map((v) => {
      const esc = escapeEsqlString(v);
      return `(MV_CONTAINS(entity.source, "${esc}") OR entity.source LIKE "${esc}.*")`;
    })
    .join(' OR ');

const intervalToEsql = (interval: string) => {
  const match = interval.match(/^(\d+)([smhdwM])$/);
  if (match == null) {
    throw new Error(`Invalid interval format: ${interval}`);
  }

  const [, value, unit] = match;
  const unitMap: Record<string, string> = {
    s: 'second',
    m: 'minute',
    h: 'hour',
    d: 'day',
    w: 'week',
    M: 'month',
  };
  const unitLabel = unitMap[unit];
  if (unitLabel == null) {
    throw new Error(`Unsupported interval unit: ${unit}`);
  }

  const numericValue = Number(value);
  const intervalUnit = numericValue === 1 ? unitLabel : `${unitLabel}s`;
  return `NOW() - ${numericValue} ${intervalUnit}`;
};

const buildIdentityFilterClauses = ({ entityTypes }: ToolParams) => {
  const clauses: string[] = [];
  if (entityTypes && entityTypes.length > 0) {
    clauses.push(`WHERE ${buildInListClause('entity.EngineMetadata.Type', entityTypes)}`);
  }
  return clauses;
};

const buildRiskAndAssetCriticalityFilterClauses = ({
  riskScoreMin,
  riskScoreMax,
  riskLevels,
  riskScoreChangeInterval,
  criticalityLevels,
  sortBy,
}: ToolParams) => {
  const clauses: string[] = [];
  if (riskScoreChangeInterval) {
    clauses.push(`WHERE entity.risk.calculated_score_norm IS NOT NULL`);
    clauses.push(
      `WHERE @timestamp >= DATE_TRUNC(1 day, ${intervalToEsql(riskScoreChangeInterval)})`
    );
  } else if (sortBy === undefined || sortBy === 'riskScore') {
    // ES|QL sorts NULL FIRST in DESC, so without this guard a plain
    // `SORT calculated_score_norm DESC | LIMIT N` query surfaces N unscored
    // entities at the top of the list. Mirror the IS NOT NULL filter already
    // used by the riskScoreChangeInterval branch so the default / explicit
    // `sortBy: 'riskScore'` ranking is meaningful. The `sortBy: 'criticality'`
    // branch does not need this because `criticality_rank` defaults to 0 for
    // null-risk entities, which deterministically lands them last.
    clauses.push(`WHERE entity.risk.calculated_score_norm IS NOT NULL`);
  }
  // Treat `riskScoreMin: 0` as "no floor" rather than `>= 0`. In ES|QL any comparison
  // against NULL is false, so emitting `calculated_score_norm >= 0` would silently drop
  // every entity whose risk score hasn't been computed yet. Only emit the filter when
  // the caller asks for a strictly positive floor.
  if (riskScoreMin != null && riskScoreMin > 0) {
    clauses.push(`WHERE entity.risk.calculated_score_norm >= ${riskScoreMin}`);
  }
  if (riskScoreMax != null) {
    clauses.push(`WHERE entity.risk.calculated_score_norm <= ${riskScoreMax}`);
  }
  if (riskLevels && riskLevels.length > 0) {
    clauses.push(`WHERE ${buildInListClause('entity.risk.calculated_level', riskLevels)}`);
  }
  if (criticalityLevels && criticalityLevels.length > 0) {
    clauses.push(`WHERE ${buildInListClause('asset.criticality', criticalityLevels)}`);
  }
  return clauses;
};

const buildAttributeFilterClauses = ({
  watchlists,
  sources,
  namespaces,
  managedOnly,
  mfaEnabledOnly,
  assetOnly,
}: ToolParams) => {
  const clauses: string[] = [];
  if (watchlists && watchlists.length > 0) {
    clauses.push(`WHERE ${buildMvContainsClause('entity.attributes.watchlists', watchlists)}`);
  }
  if (sources && sources.length > 0) {
    clauses.push(`WHERE ${buildSourceMatchClause(sources)}`);
  }
  if (namespaces && namespaces.length > 0) {
    clauses.push(`WHERE ${buildInListClause('entity.namespace', namespaces)}`);
  }
  if (managedOnly === true) {
    clauses.push(`WHERE entity.attributes.managed == true`);
  }
  if (mfaEnabledOnly === true) {
    clauses.push(`WHERE entity.attributes.mfa_enabled == true`);
  }
  if (assetOnly === true) {
    clauses.push(`WHERE entity.attributes.asset == true`);
  }
  return clauses;
};

const buildLifecycleFilterClauses = ({
  firstSeenAfter,
  firstSeenBefore,
  lastSeenAfter,
  lastSeenBefore,
}: ToolParams) => {
  const clauses: string[] = [];
  if (firstSeenAfter) {
    clauses.push(`WHERE entity.lifecycle.first_seen >= "${escapeEsqlString(firstSeenAfter)}"`);
  }
  if (firstSeenBefore) {
    clauses.push(`WHERE entity.lifecycle.first_seen <= "${escapeEsqlString(firstSeenBefore)}"`);
  }
  if (lastSeenAfter) {
    clauses.push(`WHERE entity.lifecycle.last_activity >= "${escapeEsqlString(lastSeenAfter)}"`);
  }
  if (lastSeenBefore) {
    clauses.push(`WHERE entity.lifecycle.last_activity <= "${escapeEsqlString(lastSeenBefore)}"`);
  }
  return clauses;
};

const buildStatsClause = ({ riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [
      `STATS earliest_score = FIRST(entity.risk.calculated_score_norm, @timestamp), latest_score = LAST(entity.risk.calculated_score_norm, @timestamp) BY entity.id`,
      `EVAL risk_score_change = latest_score - earliest_score`,
      `EVAL significant_increase = CASE(risk_score_change > 20, true, risk_score_change <= 20, false)`,
    ];
  }
  return [];
};

const buildEvalClause = ({ sortBy, riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [];
  }

  // `asset.criticality` is a keyword, so alphabetical ordering would surface
  // `medium_impact` above `high_impact`. Project a numeric rank so the SORT
  // reflects the operator-facing ordering (extreme > high > medium > low),
  // with NULL/unknown criticality landing at the bottom via the default `0`.
  if (sortBy === 'criticality') {
    return [
      `EVAL criticality_rank = CASE(` +
        `asset.criticality == "extreme_impact", 4, ` +
        `asset.criticality == "high_impact", 3, ` +
        `asset.criticality == "medium_impact", 2, ` +
        `asset.criticality == "low_impact", 1, ` +
        `0)`,
    ];
  }

  return [];
};

const buildSortClause = ({ sortBy, riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [`SORT risk_score_change DESC`];
  }

  if (sortBy === 'criticality') {
    // Risk score is the tiebreaker so "top N by criticality" still surfaces
    // the riskiest high-impact entity above a quieter one within the same tier.
    return [`SORT criticality_rank DESC, entity.risk.calculated_score_norm DESC`];
  }

  // default to sorting by risk score
  return [`SORT entity.risk.calculated_score_norm DESC`];
};

const buildKeepClause = ({ riskScoreChangeInterval }: ToolParams): string[] => {
  if (riskScoreChangeInterval) {
    return [];
  }

  return [`KEEP ${ENTITY_STORE_KEEP_FIELDS.join(', ')}`];
};

const buildFromClause = (
  { riskScoreChangeInterval }: ToolParams,
  entityIndex: string,
  entitySnapshotIndex?: string
): string => {
  if (riskScoreChangeInterval && entitySnapshotIndex) {
    return `FROM ${entityIndex},${entitySnapshotIndex}`;
  }
  return `FROM ${entityIndex}`;
};

const buildQuery = (
  params: ToolParams,
  entityIndex: string,
  entitySnapshotIndex?: string
): string => {
  const clauses = [
    buildFromClause(params, entityIndex, entitySnapshotIndex),
    ...buildIdentityFilterClauses(params),
    ...buildAttributeFilterClauses(params),
    ...buildLifecycleFilterClauses(params),
    ...buildRiskAndAssetCriticalityFilterClauses(params),
    ...buildStatsClause(params),
    ...buildEvalClause(params),
    ...buildSortClause(params),
    ...buildKeepClause(params),
    `LIMIT ${params.maxResults ?? 10}`,
  ];

  return clauses.join('\n| ');
};

const MULTI_ENTITY_ATTACHMENT_LABEL = 'Entity search results';

/**
 * Builds the optional `ToolResultType.other` side-effect results that
 * announce the inline `security.entity` attachment for this search call.
 *
 * The attachment is skipped when the `riskScoreChangeInterval` branch is
 * active (the STATS projection drops the identity columns, so descriptors
 * cannot be derived reliably), or when no row yields a valid descriptor.
 * When exactly one descriptor is produced we reuse the single-entity id
 * scheme used by `security.get_entity` so the two tools converge on the
 * same attachment/version instead of creating duplicates.
 */
const buildAttachmentSideEffectResults = async ({
  params,
  columns,
  values,
  attachments,
  logger,
}: {
  params: ToolParams;
  columns: Array<{ name: string }>;
  values: unknown[][];
  attachments: AttachmentStateManager;
  logger: Logger;
}): Promise<
  Array<{
    tool_result_id: string;
    type: typeof ToolResultType.other;
    data: { attachmentId: string; version: number; renderTag: string };
  }>
> => {
  if (params.riskScoreChangeInterval) {
    return [];
  }

  const descriptors = values
    .map((row) => describeAttachmentForRow({ columns, row }))
    .filter((d): d is EntityAttachmentDescriptor => d !== null);

  if (descriptors.length === 0) {
    return [];
  }

  let id: string;
  let data: Record<string, unknown>;
  let description: string;

  if (descriptors.length === 1) {
    const [descriptor] = descriptors;
    id = buildSingleEntityAttachmentId(descriptor.identifierType, descriptor.identifier);
    data = {
      identifierType: descriptor.identifierType,
      identifier: descriptor.identifier,
      attachmentLabel: descriptor.attachmentLabel,
      ...(descriptor.entityStoreId ? { entityStoreId: descriptor.entityStoreId } : {}),
    };
    description = descriptor.attachmentLabel;
  } else {
    const entities = descriptors.map(({ identifierType, identifier, entityStoreId }) => ({
      identifierType,
      identifier,
      ...(entityStoreId ? { entityStoreId } : {}),
    }));
    id = buildListEntityAttachmentId(entities);
    data = {
      entities,
      attachmentLabel: MULTI_ENTITY_ATTACHMENT_LABEL,
    };
    description = `${MULTI_ENTITY_ATTACHMENT_LABEL} (${entities.length})`;
  }

  const attachmentResult = await ensureEntityAttachment({
    attachments,
    id,
    data,
    description,
    logger,
  });

  if (!attachmentResult) {
    return [];
  }

  return [
    {
      tool_result_id: getToolResultId(),
      type: ToolResultType.other,
      data: {
        attachmentId: attachmentResult.attachmentId,
        version: attachmentResult.version,
        renderTag: buildRenderAttachmentTag(attachmentResult),
      },
    },
  ];
};

export const searchEntitiesTool = (
  core: SecuritySolutionPluginCoreSetupDependencies,
  logger: Logger,
  experimentalFeatures: ExperimentalFeatures
): BuiltinToolDefinition<typeof schema> => {
  return {
    id: SECURITY_SEARCH_ENTITIES_TOOL_ID,
    type: ToolType.builtin,
    description: `Search entity store for security entities (host, user, service, generic).
    Supports filtering by normalized risk score, asset criticality, entity attributes, lifecycle timestamps,
    and data source via two complementary parameters:
      - "sources" matches the multi-value "entity.source" field exactly or as a "<value>.*" prefix (e.g. ["aws"] matches "aws", "aws.cloudtrail", "aws.guardduty").
      - "namespaces" matches the normalized single-value "entity.namespace" field on user entities (canonical values: okta, entra_id, microsoft_365, active_directory, local, unknown, or pass-through of event.module like "aws").
    Prefer "namespaces" for user queries when a canonical vendor exists; fall back to "sources" for vendors without a namespace mapping and for host/service/generic entities.
    Use this tool to find entities matching specific criteria.
    When this tool stores a "security.entity" attachment (2+ entities returned, or a single-entity attachment shared with security.get_entity), its "other" result includes a pre-formatted \`renderTag\` string alongside \`attachmentId\` and \`version\`. To render the attachment inline, copy that \`renderTag\` string VERBATIM onto its own line in your markdown reply — do NOT assemble the tag yourself from \`attachmentId\` and \`version\`, and do NOT derive the id from entity names, emails, vendor keys, or any other prose. If the \`other\` result contains no \`renderTag\`, do NOT emit a \`<render_attachment>\` tag. You never call attachments.add with "security.entity" — the tool emits it as a side effect.
    When the user asks to show, open, view, or summarize the Entity Analytics dashboard/home/overview (built-in Security page), use these results (and optional security.get_entity) then call attachments.add with type "security.entity_analytics_dashboard" so the UI shows Preview→Canvas (see entity-analytics skill). Do not treat that as a request to compose a new Kibana saved dashboard.
    Do NOT use if entity ID (EUID) is known; use the "security.get_entity" tool instead.`,
    tags: ['security', 'entity-store', 'entity-analytics'],
    schema,
    availability: {
      cacheMode: 'space',
      handler: async ({ request, spaceId }: ToolAvailabilityContext) => {
        try {
          const availability = await getAgentBuilderResourceAvailability({ core, request, logger });
          if (availability.status === 'available') {
            const isEntityStoreV2Enabled = experimentalFeatures.entityAnalyticsEntityStoreV2;
            if (!isEntityStoreV2Enabled) {
              return {
                status: 'unavailable',
                reason: 'Entity Store V2 is not enabled.',
              };
            }

            const [coreStart] = await core.getStartServices();
            const esClient = coreStart.elasticsearch.client.asInternalUser;

            const indexExists = await esClient.indices.exists({
              index: getEntitiesAlias(ENTITY_LATEST, spaceId),
            });

            if (!indexExists) {
              return {
                status: 'unavailable',
                reason: 'Entity Store V2 index does not exist for this space',
              };
            }
          }

          return availability;
        } catch (error) {
          return {
            status: 'unavailable',
            reason: `Failed to check entity store v2 index availability: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          };
        }
      },
    },
    handler: async (params, { spaceId, esClient, attachments }) => {
      logger.debug(
        `${SECURITY_SEARCH_ENTITIES_TOOL_ID} tool called with parameters ${JSON.stringify(params)}`
      );

      let success = false;
      let entitiesReturned = 0;
      let errorMessage: string | undefined;

      try {
        const normalized = normalizeParams(params, logger);

        const client = esClient.asCurrentUser;
        const entityIndex = getEntitiesAlias(ENTITY_LATEST, spaceId);
        const entitySnapshotIndex = getHistorySnapshotIndexPattern(spaceId);
        const snapshotIndexExists = await client.indices.exists({
          index: entitySnapshotIndex,
        });
        const query = buildQuery(
          normalized,
          entityIndex,
          snapshotIndexExists ? entitySnapshotIndex : undefined
        );

        const { columns, values } = await executeEsql({ query, esClient: client });

        if (values.length === 0) {
          success = true;
          return {
            results: [
              {
                tool_result_id: getToolResultId(),
                type: ToolResultType.error,
                data: {
                  message: 'No entities found matching the specified criteria.',
                },
              },
            ],
          };
        }

        const esqlResultEntries = values.map((_, rowIdx) => ({
          tool_result_id: getToolResultId(),
          type: ToolResultType.esqlResults as const,
          data: { query, columns, values: [values[rowIdx]] },
        }));

        const attachmentSideEffectResults = await buildAttachmentSideEffectResults({
          params: normalized,
          columns,
          values,
          attachments,
          logger,
        });

        success = true;
        entitiesReturned = values.length;
        return {
          results: [...esqlResultEntries, ...attachmentSideEffectResults],
        };
      } catch (error) {
        errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          results: [
            {
              tool_result_id: getToolResultId(),
              type: ToolResultType.error,
              data: { message: `Error searching entities in Entity Store: ${errorMessage}` },
            },
          ],
        };
      } finally {
        const [coreStart] = await core.getStartServices();
        coreStart.analytics.reportEvent(ENTITY_ANALYTICS_AI_TOOL_USAGE_EVENT.eventType, {
          toolId: SECURITY_SEARCH_ENTITIES_TOOL_ID,
          entityTypes: params.entityTypes ?? [],
          spaceId,
          success,
          entitiesReturned,
          errorMessage,
        });
      }
    },
  };
};
