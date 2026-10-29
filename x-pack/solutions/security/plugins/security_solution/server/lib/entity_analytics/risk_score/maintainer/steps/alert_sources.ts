/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isEmpty } from 'lodash';
import { fromKueryExpression } from '@kbn/es-query';
import { euid, getBuiltInEntityDefinition } from '@kbn/entity-store/common/euid_helpers';
import type { RiskEngineConfiguration } from '../../../types';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { convertRangeToISO } from '../../tasks/helpers';
import {
  escapeEsqlStringLiteral,
  UNIFIED_STAMPED_ENTITY_ID_COLUMN,
} from '../../calculate_esql_risk_scores';
import type { ScopedLogger } from '../utils/with_log_context';

/**
 * Alerting v2 rule events data stream. Mirrors `ALERT_EVENTS_DATA_STREAM` in
 * `@kbn/alerting-v2-constants`; copied so this plugin takes no dependency on the alerting v2
 * packages for the prototype.
 */
export const RULE_EVENTS_DATA_STREAM = '.rule-events';

/** The v1 detection alerts store, read through its index or data view pattern. */
export interface V1AlertSource {
  kind: 'v1';
  index: string;
  /** ES|QL boolean expressions applied right after `FROM`, so they push down to Lucene. */
  where: string[];
}

/** The v2 rule events store, folded to one row per episode inside its arm. */
export interface V2AlertSource {
  kind: 'v2';
  index: string;
  /** ES|QL boolean expressions applied right after `FROM`, before the episode fold. */
  where: string[];
  /** Drop episodes whose newest event is `inactive`, the v2 analogue of `closed`. */
  excludeInactive: boolean;
}

/** Every alert store one base-scoring query reads. At least one arm is present. */
export interface UnifiedAlertSources {
  v1?: V1AlertSource;
  v2?: V2AlertSource;
}

/** Columns every arm projects, before the entity type's identity fields. */
const COMMON_COLUMNS = [
  'risk_score',
  'rule_name',
  'rule_id',
  'alert_id',
  'category',
  'time',
  UNIFIED_STAMPED_ENTITY_ID_COLUMN,
  'source_kind',
  '_index',
] as const;

const backtick = (field: string): string => `\`${field}\``;

const kqlStringLiteral = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/** `KQL("...")` over a raw KQL expression, escaped for the enclosing ES|QL string literal. */
const kqlClause = (kql: string): string => `KQL("${escapeEsqlStringLiteral(kql)}")`;

const buildRangeClause = (configuration: RiskEngineConfiguration): string => {
  const { start, end } = convertRangeToISO(configuration.range);
  return `@timestamp >= "${escapeEsqlStringLiteral(
    start
  )}" AND @timestamp < "${escapeEsqlStringLiteral(end)}"`;
};

const customFiltersForEntityType = (
  configuration: RiskEngineConfiguration,
  entityType: EntityType
): string[] =>
  (configuration.filters ?? [])
    .filter((customFilter) => customFilter.entity_types.includes(entityType))
    .map((customFilter) => customFilter.filter);

/**
 * The v1 arm's filters as ES|QL, equivalent to the DSL `buildAlertFilters` builds: time range, a
 * risk score present, excluded workflow statuses and tags, and the entity type's custom KQL.
 * Exclusions go through `KQL("NOT field:(...)")` because a bare `NOT field IN (...)` drops rows
 * where the field is null, which DSL `must_not` keeps.
 */
export const buildV1AlertWhere = ({
  configuration,
  entityType,
  logger,
}: {
  configuration: RiskEngineConfiguration;
  entityType: EntityType;
  logger?: ScopedLogger;
}): string[] => {
  const where = ['kibana.alert.risk_score IS NOT NULL', buildRangeClause(configuration)];

  const { excludeAlertStatuses, excludeAlertTags, filter } = configuration;
  if (excludeAlertStatuses && excludeAlertStatuses.length > 0) {
    where.push(
      kqlClause(
        `NOT kibana.alert.workflow_status:(${excludeAlertStatuses
          .map(kqlStringLiteral)
          .join(' or ')})`
      )
    );
  }
  if (excludeAlertTags && excludeAlertTags.length > 0) {
    where.push(
      kqlClause(
        `NOT kibana.alert.workflow_tags:(${excludeAlertTags.map(kqlStringLiteral).join(' or ')})`
      )
    );
  }
  if (!isEmpty(filter)) {
    logger?.warn(
      'The risk engine configuration carries a raw query DSL `filter`, which the unified v1+v2 alert query cannot apply; it is ignored for this run'
    );
  }

  for (const customFilter of customFiltersForEntityType(configuration, entityType)) {
    try {
      fromKueryExpression(customFilter);
      where.push(kqlClause(customFilter));
    } catch (error) {
      // Mirror the DSL path: bad user input must not fail the run, but it must be observable.
      logger?.warn(
        `Skipping invalid KQL custom filter for ${entityType}: "${customFilter}" — ${error}`
      );
    }
  }

  return where;
};

/**
 * The v2 arm's filters: alert-kind events of this space in the time range. Only the `closed`
 * exclusion has a v2 analogue the prototype supports (an `inactive` newest event); acknowledged,
 * tag exclusions and custom KQL need the `.alert-actions` join or field renaming into `data`, so
 * they are logged and skipped.
 */
export const buildV2AlertWhere = ({
  configuration,
  entityType,
  spaceId,
  logger,
}: {
  configuration: RiskEngineConfiguration;
  entityType: EntityType;
  spaceId: string;
  logger?: ScopedLogger;
}): Pick<V2AlertSource, 'where' | 'excludeInactive'> => {
  const where = [
    'type == "alert"',
    `space_id == "${escapeEsqlStringLiteral(spaceId)}"`,
    buildRangeClause(configuration),
  ];

  const excludeAlertStatuses = configuration.excludeAlertStatuses ?? [];
  const unsupportedStatuses = excludeAlertStatuses.filter((status) => status !== 'closed');
  if (unsupportedStatuses.length > 0) {
    logger?.warn(
      `Excluding alert statuses [${unsupportedStatuses.join(
        ', '
      )}] is not supported on v2 alerts yet; only "closed" is applied to them`
    );
  }
  if (configuration.excludeAlertTags && configuration.excludeAlertTags.length > 0) {
    logger?.warn(
      'Excluding alert tags is not supported on v2 alerts yet; v2 alerts keep every tag'
    );
  }
  const customFilters = customFiltersForEntityType(configuration, entityType);
  if (customFilters.length > 0) {
    logger?.warn(
      `${customFilters.length} custom KQL filter(s) for ${entityType} are not applied to v2 alerts yet`
    );
  }

  return { where, excludeInactive: excludeAlertStatuses.includes('closed') };
};

/**
 * Source fields the entity type's EUID derivation reads (`host.id`, `user.name`, `event.module`,
 * ...). Every arm of a unified source must project them under these names so the derivation,
 * which is written against raw alert fields, works on the common row.
 *
 * Read off the generated ES|QL fragments: every raw field reference in them is wrapped in
 * `TO_STRING(...)`, and every computed column is an assignment target, which is excluded.
 */
export const getEuidSourceFields = (entityType: EntityType): string[] => {
  const definition = getBuiltInEntityDefinition(entityType);
  const fragments = [
    euid.esql.getEuidDocumentsContainsIdFilter(definition),
    euid.esql.getFieldEvaluations(definition) ?? '',
    euid.esql.getEuidEvaluation(definition, 'entity_id', { withTypeId: true }),
  ].join('\n');

  const assigned = new Set(
    [...fragments.matchAll(/^\s*([A-Za-z0-9_.]+)\s*=(?!=)/gm)].map((match) => match[1])
  );
  const referenced = [...fragments.matchAll(/TO_STRING\(([A-Za-z0-9_.]+)\)/g)].map(
    (match) => match[1]
  );

  return [...new Set(referenced)]
    .filter((field) => !assigned.has(field) && !field.startsWith('_'))
    .sort();
};

const buildV1Arm = (source: V1AlertSource, identityFields: string[], keep: string): string => {
  const identityEvals = identityFields.map(
    (field) => `${backtick(field)} = ${backtick(field)}::keyword`
  );
  return `(
    FROM ${source.index} METADATA _index
    | WHERE ${source.where.join(' AND ')}
    | EVAL risk_score = kibana.alert.risk_score::double,
           rule_name = kibana.alert.rule.name::keyword,
           rule_id = kibana.alert.rule.uuid::keyword,
           alert_id = kibana.alert.uuid::keyword,
           category = event.kind::keyword,
           time = @timestamp,
           ${UNIFIED_STAMPED_ENTITY_ID_COLUMN} = kibana.alert.entity.id::keyword,
           source_kind = "v1"${identityEvals
             .map((assignment) => `,\n           ${assignment}`)
             .join('')}
    | KEEP ${keep}
  )`;
};

/**
 * One row per episode: the newest event decides the status, and `LIMIT 1 BY` breaks ties when a
 * run writes several events with one timestamp. Rule events are keyword leaves inside the
 * `flattened` payload, so each column is a `FIELD_EXTRACT` with a cast. Events without a risk
 * score are not Security detection alerts and are dropped.
 */
const buildV2Arm = (source: V2AlertSource, identityFields: string[], keep: string): string => {
  const identityEvals = identityFields.map(
    (field) =>
      `${backtick(field)} = FIELD_EXTRACT(data, "${escapeEsqlStringLiteral(field)}")::keyword`
  );
  const statusClause = source.excludeInactive ? ' AND alert.status != "inactive"' : '';
  return `(
    FROM ${source.index} METADATA _index
    | WHERE ${source.where.join(' AND ')}
    | INLINE STATS last_timestamp = MAX(@timestamp) BY alert.id
    | WHERE @timestamp == last_timestamp${statusClause}
    | LIMIT 1 BY alert.id
    | EVAL risk_score = FIELD_EXTRACT(data, "kibana.alert.risk_score")::double,
           rule_name = FIELD_EXTRACT(data, "kibana.alert.rule.name")::keyword,
           rule_id = rule.id::keyword,
           alert_id = alert.id::keyword,
           category = FIELD_EXTRACT(data, "event.kind")::keyword,
           time = @timestamp,
           ${UNIFIED_STAMPED_ENTITY_ID_COLUMN} = FIELD_EXTRACT(data, "kibana.alert.entity.id")::keyword,
           source_kind = "v2"${identityEvals
             .map((assignment) => `,\n           ${assignment}`)
             .join('')}
    | WHERE risk_score IS NOT NULL
    | KEEP ${keep}
  )`;
};

/**
 * The `FROM` of a base-scoring query over every configured alert store: one subquery arm per
 * store, each projecting the same row (risk score, rule, alert id, time, stamped EUID, origin and
 * the type's identity fields), so everything after it is store-agnostic. Needs nested `FROM`
 * subqueries (Elasticsearch 9.6).
 */
export const buildUnifiedAlertSourceEsql = (
  sources: UnifiedAlertSources,
  entityType: EntityType
): string => {
  const identityFields = getEuidSourceFields(entityType);
  const keep = [...COMMON_COLUMNS, ...identityFields.map(backtick)].join(', ');
  const arms = [
    sources.v1 ? buildV1Arm(sources.v1, identityFields, keep) : undefined,
    sources.v2 ? buildV2Arm(sources.v2, identityFields, keep) : undefined,
  ].filter((arm): arm is string => arm !== undefined);

  if (arms.length === 0) {
    throw new Error('A unified alert source needs at least one alert store');
  }

  return `FROM ${arms.join(', ')}`;
};

/**
 * Builds the arms for the stores that exist in this space. The v1 index is created lazily by
 * the first detection rule run and `.rule-events` by the alerting v2 plugin, so either may be
 * absent; an absent store is left out rather than failing the query. Returns `undefined` when
 * neither exists, which the caller treats as nothing to score.
 */
export const resolveUnifiedAlertSources = async ({
  esClient,
  configuration,
  alertsIndex,
  entityType,
  spaceId,
  logger,
}: {
  esClient: ElasticsearchClient;
  configuration: RiskEngineConfiguration;
  alertsIndex: string;
  entityType: EntityType;
  spaceId: string;
  logger: ScopedLogger;
}): Promise<UnifiedAlertSources | undefined> => {
  const [v1Exists, v2Exists] = await Promise.all([
    esClient.indices.exists({ index: alertsIndex }),
    esClient.indices.exists({ index: RULE_EVENTS_DATA_STREAM }),
  ]);

  const sources: UnifiedAlertSources = {};
  if (v1Exists) {
    sources.v1 = {
      kind: 'v1',
      index: alertsIndex,
      where: buildV1AlertWhere({ configuration, entityType, logger }),
    };
  } else {
    logger.debug(`v1 alerts index "${alertsIndex}" does not exist yet; scoring v2 alerts only`);
  }
  if (v2Exists) {
    sources.v2 = {
      kind: 'v2',
      index: RULE_EVENTS_DATA_STREAM,
      ...buildV2AlertWhere({ configuration, entityType, spaceId, logger }),
    };
  } else {
    logger.debug(`"${RULE_EVENTS_DATA_STREAM}" does not exist; scoring v1 alerts only`);
  }

  return sources.v1 || sources.v2 ? sources : undefined;
};
