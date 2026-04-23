/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLSearchResponse } from '@kbn/es-types';
import {
  conditionToESQL,
  isAlwaysCondition,
  isAndCondition,
  isFilterCondition,
  isNeverCondition,
  isNotCondition,
  isOrCondition,
  type Condition,
} from '@kbn/streamlang';
import { recentData } from '../../../common/domain/definitions/esql';
import type {
  EntityDefinition,
  FieldValueSchema,
  SetFieldsByCondition,
} from '../../../common/domain/definitions/entity_schema';
import { escapeEsqlStringLiteral } from '../../../common/esql/strings';
import {
  type EntityField,
  type EntityType,
} from '../../../common/domain/definitions/entity_schema';
import {
  getEuidEsqlDocumentsContainsIdFilter,
  getFieldEvaluationsEsqlFromDefinition,
} from '../../../common/domain/euid/esql';
import { getFieldEvaluationsFromDefinition } from '../../../common/domain/euid/field_evaluations';

export const ENGINE_METADATA_PAGINATION_FIRST_SEEN_LOG_FIELD =
  'entity.EngineMetadata.FirstSeenLogInPage';
export const ENGINE_METADATA_UNTYPED_ID_FIELD = 'entity.EngineMetadata.UntypedId';
export const ENGINE_METADATA_TYPE_FIELD = 'entity.EngineMetadata.Type';

export const MAIN_ENTITY_ID_FIELD = 'entity.id';
export const ENTITY_NAME_FIELD = 'entity.name';
export const ENTITY_TYPE_FIELD = 'entity.type';
export const TIMESTAMP_FIELD = '@timestamp';

export const DOCUMENT_ID_FIELD = '_id';

const METADATA_FIELDS = ['_index', '_id'];

export interface PaginationParams {
  timestampCursor: string;
  idCursor: string;
}

export interface PaginationFields {
  // Timestamp to sort and paginate on
  timestampField: string;
  // Intermediate id field used in the query for pagination
  idFieldInQuery: string;
  // Final id field kept in the result
  finalIdField: string;
}

export interface LogPageProbeSourceClauseParams {
  indexPatterns: string[];
  type: EntityType;
  fromDateISO: string;
  toDateISO: string;
  recoveryId?: string;
  /** Exclusive lower bound on (@timestamp, _id) for log-slice pagination within the time window. */
  logsPageCursorStart?: PaginationParams;
}

/** Bounded extraction: same as probe plus optional inclusive upper bound on (@timestamp, _id). */
export type ExtractionSourceClauseParams = LogPageProbeSourceClauseParams & {
  logsPageCursorEnd?: PaginationParams;
};

export function buildLogPageProbeSourceClause(params: LogPageProbeSourceClauseParams): string {
  const { indexPatterns, type, fromDateISO, toDateISO, recoveryId, logsPageCursorStart } = params;

  // If recoveryId is set we use an inclusive lower bound because we are recovering
  //  from a previous extraction and we don't want to miss any logs from the previous window
  //
  // If logsPageCursorStart is not set we use a inclusive lower bound because we are starting a new extraction
  // and we want to include all logs from the new window
  const inclusiveLowerBound = recoveryId || !logsPageCursorStart ? true : false;

  const baseWhere = `FROM ${indexPatterns.join(', ')}
    METADATA ${METADATA_FIELDS.join(', ')}
  | WHERE 
      ${TIMESTAMP_FIELD} ${inclusiveLowerBound ? '>=' : '>'} TO_DATETIME("${fromDateISO}")
      AND ${TIMESTAMP_FIELD} <= TO_DATETIME("${toDateISO}")
      AND (${getEuidEsqlDocumentsContainsIdFilter(type)})`;

  if (!logsPageCursorStart) {
    return baseWhere;
  }

  return `${baseWhere}
      AND ${buildLogsPageStartFilter(logsPageCursorStart)}`;
}

export function buildExtractionSourceClause(
  params: LogPageProbeSourceClauseParams & { logsPageCursorEnd?: PaginationParams }
): string {
  if (params.logsPageCursorEnd) {
    const { logsPageCursorEnd, ...probeParams } = params;
    return (
      buildLogPageProbeSourceClause(probeParams) +
      `\n      AND ${buildLogsPageEndFilter(logsPageCursorEnd)}`
    );
  }
  return buildLogPageProbeSourceClause(params);
}

function buildLogsPageStartFilter(cursor: PaginationParams): string {
  const escapedId = escapeEsqlStringLiteral(cursor.idCursor);
  return `(
      ${TIMESTAMP_FIELD} > TO_DATETIME("${cursor.timestampCursor}")
      OR (
        ${TIMESTAMP_FIELD} == TO_DATETIME("${cursor.timestampCursor}")
        AND \`${DOCUMENT_ID_FIELD}\` > "${escapedId}"
      )
    )`;
}

function buildLogsPageEndFilter(end: PaginationParams): string {
  const escapedId = escapeEsqlStringLiteral(end.idCursor);
  return `(
      ${TIMESTAMP_FIELD} < TO_DATETIME("${end.timestampCursor}")
      OR (
        ${TIMESTAMP_FIELD} == TO_DATETIME("${end.timestampCursor}")
        AND \`${DOCUMENT_ID_FIELD}\` <= "${escapedId}"
      )
    )`;
}

export function aggregationStats(fields: EntityField[], renameToRecent: boolean = true): string {
  return fields
    .map((field) => {
      const { retention, destination: dest } = field;
      const finalDest = renameToRecent ? recentData(dest) : dest;
      const castedSrc = castSrcType(field);
      switch (retention.operation) {
        case 'collect_values':
          return `${finalDest} = MV_DEDUPE(TOP(${castedSrc}, ${retention.maxLength})) WHERE ${castedSrc} IS NOT NULL`;
        case 'prefer_newest_value':
          return `${finalDest} = LAST(${castedSrc}, ${TIMESTAMP_FIELD}) WHERE ${castedSrc} IS NOT NULL`;
        case 'prefer_oldest_value':
          return `${finalDest} = FIRST(${castedSrc}, ${TIMESTAMP_FIELD}) WHERE ${castedSrc} IS NOT NULL`;
        default:
          throw new Error('unknown field operation');
      }
    })
    .join(',\n ');
}

export function fieldsToKeep(definitionFields: EntityField[], defaultFields: string[]): string {
  const allFieldPatterns = definitionFields
    .map(({ destination }) => destination)
    .concat(defaultFields)
    .map((field) => {
      const dotIndex = field.indexOf('.');
      // not a pattern
      if (dotIndex === -1) {
        return field;
      }

      const firstPart = field.substring(0, dotIndex);
      return `${firstPart}*`;
    });

  return [...new Set(allFieldPatterns)].join(',\n');
}

export function castSrcType(field: EntityField): string {
  switch (field.mapping?.type) {
    case 'keyword':
      return `TO_STRING(${field.source})`;
    case 'date':
      return `TO_DATETIME(${field.source})`;
    case 'boolean':
      return `TO_BOOLEAN(${field.source})`;
    case 'long':
      return `TO_LONG(${field.source})`;
    case 'integer':
      return `TO_INTEGER(${field.source})`;
    case 'float':
      return `TO_DOUBLE(${field.source})`;
    case 'ip':
      return `TO_IP(${field.source})`;
    case 'scaled_float':
      return `${field.source}`;
    default:
      return field.source;
  }
}

export function extractPaginationParams(
  esqlResponse: ESQLSearchResponse,
  maxDocs: number,
  paginationFields: PaginationFields
): PaginationParams | undefined {
  const count = esqlResponse.values.length;
  if (count === 0 || count < maxDocs) {
    return undefined;
  }

  const { timestampField, finalIdField: idField } = paginationFields;
  const columns = esqlResponse.columns;
  const timestampFieldIdx = columns.findIndex(({ name }) => name === timestampField);
  if (timestampFieldIdx === -1) {
    throw new Error(`${timestampField} not found in esql response, internal logic error`);
  }

  const idFieldIdx = columns.findIndex(({ name }) => name === idField);
  if (idFieldIdx === -1) {
    throw new Error(`${idField} not found in esql response, internal logic error`);
  }

  const lastResult = esqlResponse.values[esqlResponse.values.length - 1];
  const timestampCursor = lastResult[timestampFieldIdx] as string;
  const idCursor = lastResult[idFieldIdx] as string;
  return {
    timestampCursor,
    idCursor,
  };
}

/**
 * Builds the ESQL fragment that evaluates shared and identity fieldEvaluations (EVAL only).
 * Returns empty string when there are no field evaluations.
 */
export function buildFieldEvaluations(entityDefinition: EntityDefinition): string {
  const fieldEvaluationsEsql = getFieldEvaluationsEsqlFromDefinition(entityDefinition);
  if (fieldEvaluationsEsql === undefined || fieldEvaluationsEsql === '') {
    return '';
  }
  return `| EVAL ${fieldEvaluationsEsql}`;
}

function fieldValueToEsqlExpression(value: FieldValueSchema): string {
  if (typeof value === 'string') {
    return `"${escapeEsqlStringLiteral(value)}"`;
  }
  if ('source' in value) {
    return `TO_STRING(${value.source})`;
  }
  const { fields, sep } = value.composition;
  const escapedSep = escapeEsqlStringLiteral(sep);
  const parts = fields.flatMap((f, i) =>
    i === 0 ? [`TO_STRING(${f})`] : [`"${escapedSep}"`, `TO_STRING(${f})`]
  );
  return `CONCAT(${parts.join(', ')})`;
}

/** When set, condition and field references use post-STATS columns (see {@link buildPostStatsLogicalToColumnMap}). */
export interface BuildSetFieldsByConditionPostStatsContext {
  entityFields: EntityField[];
  useRecentDataPrefix: boolean;
}

/**
 * Builds ESQL EVAL CASE fragments for when-condition field overrides (pre-STATS by default).
 * Pass `postStats` for after-STATS rows in logs extraction (main vs CCS differs by `useRecentDataPrefix`).
 */
export function buildSetFieldsByCondition(
  setFieldsByCondition: SetFieldsByCondition,
  postStats?: BuildSetFieldsByConditionPostStatsContext
): string {
  const { condition, fields: overrideFields } = setFieldsByCondition;

  if (postStats) {
    const logicalToColumn = buildPostStatsLogicalToColumnMap(
      postStats.entityFields,
      postStats.useRecentDataPrefix
    );
    const resolveColumn = (logical: string) => logicalToColumn.get(logical) ?? logical;
    const remappedCondition = mapConditionFieldsForPostStats(condition, resolveColumn);
    const conditionEsql = conditionToESQL(remappedCondition);
    const evals = Object.entries(overrideFields).map(([field, value]) => {
      const targetCol = resolveColumn(field);
      const valueExpr = fieldValueToEsqlExpressionAfterStats(
        value,
        postStats.entityFields,
        logicalToColumn
      );
      return `${targetCol} = CASE((${conditionEsql}), ${valueExpr}, ${targetCol})`;
    });
    return `| EVAL ${evals.join(',\n    ')}`;
  }

  const conditionEsql = conditionToESQL(condition);
  const evals = Object.entries(overrideFields).map(([field, value]) => {
    const valueExpr = fieldValueToEsqlExpression(value);
    return `${field} = CASE((${conditionEsql}), ${valueExpr}, ${field})`;
  });
  return `| EVAL ${evals.join(',\n    ')}`;
}

/**
 * Maps logical field paths (entity `fields[].source` / `fields[].destination`) to ESQL column names
 * after STATS: `recent.<destination>` when `useRecentDataPrefix` is true (main extraction), else `<destination>` (CCS).
 */
export function buildPostStatsLogicalToColumnMap(
  entityFields: EntityField[],
  useRecentDataPrefix: boolean
): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of entityFields) {
    const col = useRecentDataPrefix ? recentData(f.destination) : f.destination;
    m.set(f.destination, col);
    m.set(f.source, col);
  }
  return m;
}

const RECENT_ESQL_COLUMN_PREFIX = 'recent.';

/** Destinations aggregated under `recent.<destination>` in main logs extraction STATS. */
export function statsFieldDestinations(fields: EntityField[]): Set<string> {
  return new Set(fields.map((f) => f.destination));
}

/**
 * Rewrites `postAggFilter` leaf `field` names for the ESQL row after STATS and LOOKUP JOIN.
 *
 * Columns from `aggregationStats` use `recent.<destination>`; any leaf whose `field` is a
 * `fields[].destination` is prefixed with `recentData(...)` unless already `recent.*`.
 * `entity.id` is left plain: it refers to the lookup (latest index) side for already-stored entities.
 */
export function mapPostAggFilterFieldsToRecentForEsql(
  postAggFilter: Condition,
  entityDefinition: Pick<EntityDefinition, 'fields'>
): Condition {
  const destinations = statsFieldDestinations(entityDefinition.fields);

  const mapNode = (node: Condition): Condition => {
    if (isAlwaysCondition(node) || isNeverCondition(node)) {
      return node;
    }
    if (isAndCondition(node)) {
      return { ...node, and: node.and.map(mapNode) };
    }
    if (isOrCondition(node)) {
      return { ...node, or: node.or.map(mapNode) };
    }
    if (isNotCondition(node)) {
      return { ...node, not: mapNode(node.not) };
    }
    if (isFilterCondition(node)) {
      const { field } = node;
      if (field.startsWith(RECENT_ESQL_COLUMN_PREFIX) || field === MAIN_ENTITY_ID_FIELD) {
        return node;
      }
      if (destinations.has(field)) {
        return { ...node, field: recentData(field) };
      }
      return node;
    }
    return node;
  };

  return mapNode(postAggFilter);
}

function mapConditionFieldsForPostStats(
  condition: Condition,
  resolveColumn: (logicalField: string) => string
): Condition {
  if (isAlwaysCondition(condition) || isNeverCondition(condition)) {
    return condition;
  }
  if (isFilterCondition(condition)) {
    return { ...condition, field: resolveColumn(condition.field) };
  }
  if (isAndCondition(condition)) {
    return { and: condition.and.map((c) => mapConditionFieldsForPostStats(c, resolveColumn)) };
  }
  if (isOrCondition(condition)) {
    return { or: condition.or.map((c) => mapConditionFieldsForPostStats(c, resolveColumn)) };
  }
  if (isNotCondition(condition)) {
    return { not: mapConditionFieldsForPostStats(condition.not, resolveColumn) };
  }
  return condition;
}

function fieldToEsqlExpressionUsingColumn(field: EntityField, columnRef: string): string {
  switch (field.mapping?.type) {
    case 'keyword':
      return `TO_STRING(${columnRef})`;
    case 'date':
      return `TO_DATETIME(${columnRef})`;
    case 'boolean':
      return `TO_BOOLEAN(${columnRef})`;
    case 'long':
      return `TO_LONG(${columnRef})`;
    case 'integer':
      return `TO_INTEGER(${columnRef})`;
    case 'float':
      return `TO_DOUBLE(${columnRef})`;
    case 'ip':
      return `TO_IP(${columnRef})`;
    case 'scaled_float':
      return columnRef;
    default:
      return `TO_STRING(${columnRef})`;
  }
}

function fieldValueToEsqlExpressionAfterStats(
  value: FieldValueSchema,
  entityFields: EntityField[],
  logicalToColumn: Map<string, string>
): string {
  if (typeof value === 'string') {
    return `"${escapeEsqlStringLiteral(value)}"`;
  }
  if ('source' in value) {
    const col = logicalToColumn.get(value.source) ?? value.source;
    const ef =
      entityFields.find((f) => f.source === value.source) ??
      entityFields.find((f) => f.destination === value.source);
    return ef ? fieldToEsqlExpressionUsingColumn(ef, col) : `TO_STRING(${col})`;
  }
  const { fields, sep } = value.composition;
  const escapedSep = escapeEsqlStringLiteral(sep);
  const parts = fields.flatMap((path, i) => {
    const col = logicalToColumn.get(path) ?? path;
    const ef =
      entityFields.find((f) => f.source === path) ??
      entityFields.find((f) => f.destination === path);
    const fragment = ef ? fieldToEsqlExpressionUsingColumn(ef, col) : `TO_STRING(${col})`;
    return i === 0 ? [fragment] : [`"${escapedSep}"`, fragment];
  });
  return `CONCAT(${parts.join(', ')})`;
}

export function buildPaginationSection(
  fromDateISO: string,
  docsLimit: number,
  paginationFields: PaginationFields,
  pagination?: PaginationParams,
  recoveryId?: string
): string[] {
  const parts = [];
  parts.push(
    `| SORT ${paginationFields.timestampField} ASC, ${paginationFields.idFieldInQuery} ASC`
  );

  if (pagination) {
    if (!recoveryId) {
      parts.push(getPaginationWhereClause(paginationFields, pagination));
    } else {
      parts.push(
        getPaginationWhereClause(paginationFields, pagination, { fromDateISO, recoveryId })
      );
    }
  }

  parts.push(`| LIMIT ${docsLimit}`);
  return parts;
}

function getPaginationWhereClause(
  paginationFields: PaginationFields,
  pagination: PaginationParams,
  paginationRecovery?: { fromDateISO: string; recoveryId: string }
): string {
  if (paginationRecovery) {
    return buildPaginationWhereClause(
      { timestampCursor: paginationRecovery.fromDateISO, idCursor: paginationRecovery.recoveryId },
      paginationFields
    );
  }

  return buildPaginationWhereClause(pagination, paginationFields);
}

function buildPaginationWhereClause(
  { timestampCursor, idCursor }: PaginationParams,
  { timestampField, idFieldInQuery: idFieldExprForWhere }: PaginationFields
): string {
  return `| WHERE ${timestampField} > TO_DATETIME("${timestampCursor}") 
            OR (${timestampField} == TO_DATETIME("${timestampCursor}") 
                AND ${idFieldExprForWhere} > "${idCursor}")`;
}

export function hasFieldEvaluations(entityDefinition: EntityDefinition): boolean {
  return getFieldEvaluationsFromDefinition(entityDefinition).length > 0;
}
