/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Client-side grouping of the v.8 Entities table rows. Resolved entities can
 * group by entity type (they are already one row per resolution) or a custom
 * field. Individual records can nest groups — entity type, then the identity
 * they resolved to, then a custom field — the same way the Alerts page does.
 */

import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { GroupingBucket, ParsedGroupingAggregation } from '@kbn/grouping';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { getRiskLevel } from '../../../../../../common/entity_analytics/risk_engine';
import { ENTITY_FIELDS, ENTITY_GROUPING_OPTIONS } from '../../entities_table/constants';
import type { CriticalityLevelWithUnassigned } from '../../../../../../common/entity_analytics/asset_criticality/types';
import type {
  EntitiesGroupingAggregation,
  TargetEntityMetadata,
} from '../../entities_table/grouping/use_fetch_grouped_data';
import { IDENTITY_BY_ID, scoreDeltaPercent } from '../v2/data';
import { ENTITY_STORE_FIELDS } from './entity_store_fields';
import type { EntityRow, RawRecordRow } from './resolved_entities_data';
import { getActiveTimeRange } from './active_time_range';
import { riskPointsInWindow } from './signal_windows';

export interface FaceliftTargetMetadata extends TargetEntityMetadata {
  riskChangePercent: number;
  criticality: CriticalityLevelWithUnassigned;
  alerts: number;
  anomalies: number;
  cases: number;
}

export type FaceliftTargetMetadataMap = Map<string, FaceliftTargetMetadata>;

const ENTITY_TYPE_ORDER: EntityType[] = [EntityType.user, EntityType.host, EntityType.service];

/** Custom-field picker needs aggregatable strings; the prototype catalogue always has some. */
export const GROUPING_CUSTOM_FIELDS: FieldSpec[] = ENTITY_STORE_FIELDS.filter(
  (field) => field.type === 'string'
).map((field) => ({
  name: field.name,
  type: 'string',
  esTypes: [field.esType],
  searchable: true,
  aggregatable: true,
  readFromDocValues: true,
  scripted: false,
})) as FieldSpec[];

const MISSING_GROUP = '-';

const getResolvedToId = (row: EntityRow): string => {
  const resolvedTo = 'resolvedTo' in row ? (row as RawRecordRow).resolvedTo : undefined;
  return resolvedTo?.id ?? row.entityId;
};

export const getRowGroupKey = (row: EntityRow, selectedGroup: string): string => {
  switch (selectedGroup) {
    case ENTITY_GROUPING_OPTIONS.ENTITY_TYPE:
    case 'entity.type':
      return row.entityType;
    case ENTITY_GROUPING_OPTIONS.RESOLUTION:
      return getResolvedToId(row);
    case ENTITY_FIELDS.ENTITY_NAME:
      return row.name;
    case ENTITY_FIELDS.ENTITY_ID:
      return row.entityId;
    case ENTITY_FIELDS.ENTITY_SOURCE:
      return row.sources[0] ?? MISSING_GROUP;
    case 'asset.criticality':
      return row.criticality || MISSING_GROUP;
    case 'entity.risk.calculated_level':
      return getRiskLevel(row.riskScore);
    case 'entity.attributes.watchlists':
      return row.watchlists[0] ?? MISSING_GROUP;
    default:
      return MISSING_GROUP;
  }
};

export const filterRowsForGroup = (
  rows: EntityRow[],
  selectedGroup: string,
  bucket: { key: string | string[]; key_as_string?: string }
): EntityRow[] => {
  const groupKey =
    bucket.key_as_string ?? (Array.isArray(bucket.key) ? bucket.key[0] : String(bucket.key));
  return rows.filter((row) => getRowGroupKey(row, selectedGroup) === groupKey);
};

/**
 * Resolution-group header stats need the *resolved entity’s* risk, not the
 * highest (or first) raw-record score in the bucket. amber.rodriguez is 93
 * while its contributing records go up to 96.
 */
const resolvedEntityRiskScore = (row: EntityRow): number | null => {
  const resolvedId = (row as RawRecordRow).resolvedTo?.id;
  if (!resolvedId) {
    return row.riskScore;
  }
  return IDENTITY_BY_ID[resolvedId]?.riskScore ?? null;
};

export const buildTargetMetadata = (rows: EntityRow[]): FaceliftTargetMetadataMap => {
  const metadata: FaceliftTargetMetadataMap = new Map();
  const rowsByResolvedId = new Map<string, EntityRow[]>();
  for (const row of rows) {
    const raw = row as RawRecordRow;
    const id = raw.resolvedTo?.id ?? row.entityId;
    const group = rowsByResolvedId.get(id);
    if (group) {
      group.push(row);
    } else {
      rowsByResolvedId.set(id, [row]);
    }
  }

  const range = getActiveTimeRange();
  for (const [id, groupRows] of rowsByResolvedId) {
    const first = groupRows[0] as RawRecordRow;
    const identity = IDENTITY_BY_ID[id];
    const riskPoints = identity
      ? riskPointsInWindow(identity.riskDelta24h, range)
      : first.riskDelta24h;
    const sumOf = (pick: (row: EntityRow) => number) =>
      groupRows.reduce((total, row) => total + pick(row), 0);

    metadata.set(id, {
      name: first.resolvedTo?.name ?? first.name,
      type: first.resolvedTo?.entityType ?? first.entityType,
      riskScore: resolvedEntityRiskScore(first),
      individualRiskScore: first.riskScore,
      riskChangePercent: identity
        ? scoreDeltaPercent(identity.riskScore, riskPoints)
        : first.riskChangePercent,
      criticality: identity?.criticality ?? first.criticality,
      alerts: sumOf((row) => row.alerts),
      anomalies: sumOf((row) => row.anomalies),
      cases: sumOf((row) => row.cases),
    });
  }
  return metadata;
};

export const buildTableGroupingData = (
  rows: EntityRow[],
  selectedGroup: string
): ParsedGroupingAggregation<EntitiesGroupingAggregation> => {
  const byKey = new Map<string, EntityRow[]>();
  for (const row of rows) {
    const key = getRowGroupKey(row, selectedGroup);
    const group = byKey.get(key);
    if (group) {
      group.push(row);
    } else {
      byKey.set(key, [row]);
    }
  }

  const orderedKeys =
    selectedGroup === ENTITY_GROUPING_OPTIONS.ENTITY_TYPE
      ? ENTITY_TYPE_ORDER.filter((type) => byKey.has(type))
      : Array.from(byKey.entries())
          .sort((a, b) => {
            const riskDelta =
              Math.max(...b[1].map((row) => row.riskScore)) -
              Math.max(...a[1].map((row) => row.riskScore));
            if (riskDelta !== 0) return riskDelta;
            return b[1].length - a[1].length;
          })
          .map(([key]) => key);

  const buckets: Array<GroupingBucket<EntitiesGroupingAggregation>> = orderedKeys.map((key) => {
    const groupRows = byKey.get(key) ?? [];
    const resolutionRisk =
      groupRows[0] != null ? resolvedEntityRiskScore(groupRows[0]) : null;
    return {
      key: [key],
      key_as_string: key,
      selectedGroup,
      doc_count: groupRows.length,
      ...(selectedGroup === ENTITY_GROUPING_OPTIONS.RESOLUTION
        ? { resolutionRiskScore: { value: resolutionRisk } }
        : {}),
    };
  });

  return {
    groupsCount: { value: buckets.length },
    unitsCount: { value: rows.length },
    groupByFields: { buckets },
  };
};
