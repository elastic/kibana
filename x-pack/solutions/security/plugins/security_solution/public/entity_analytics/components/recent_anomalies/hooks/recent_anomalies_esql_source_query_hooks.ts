/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityStoreEuid } from '@kbn/entity-store/public';
import { useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { ML_ANOMALIES_INDEX } from '../../../../../common/constants';
import { useIntervalForHeatmap } from '../anomaly_heatmap_interval';
import type { AnomalyBand } from '../anomaly_bands';
import { getHiddenBandsFilters } from '../hidden_bands_filter';
import { getLatestEntitiesIndexName } from '../../home/constants';

export type ViewByMode = 'entity' | 'jobId';

const ANOMALY_ENTITY_TYPES = ['user', 'host', 'service'] as const;

/** The entity name field (e.g. user.name) used as the display name for each entity type. */
const ENTITY_NAME_FIELD: Record<(typeof ANOMALY_ENTITY_TYPES)[number], string> = {
  user: 'user.name',
  host: 'host.name',
  service: 'service.name',
};

/**
 * EUID evaluation block for ES|QL queries on ML anomaly records.
 * Uses the entity store EUID helpers to compute typed EUIDs (e.g. "user:alice@okta", "host:server1")
 * that match the entity store's EUID format for accurate LOOKUP JOIN matching.
 *
 * Also computes:
 * - entity_type: "user" | "host" | "service" (based on which EUID matched)
 * - entity_name: the display name from the winning entity type's name field
 */
const getEuidEvaluationBlock = (euidApi: EntityStoreEuid) => {
  const parts: string[] = [];

  for (const entityType of ANOMALY_ENTITY_TYPES) {
    const fieldEvals = euidApi.esql.getFieldEvaluationsEsql(entityType);
    if (fieldEvals) {
      parts.push(`| EVAL ${fieldEvals}`);
    }
    parts.push(`| EVAL ${entityType}_euid = ${euidApi.esql.getEuidEvaluation(entityType)}`);
  }

  parts.push(
    `| EVAL entity_id = COALESCE(${ANOMALY_ENTITY_TYPES.map((t) => `${t}_euid`).join(', ')})`
  );

  const entityTypeCases = ANOMALY_ENTITY_TYPES.map((t) => `${t}_euid IS NOT NULL, "${t}"`).join(
    ', '
  );
  parts.push(`| EVAL entity_type = CASE(${entityTypeCases}, NULL)`);

  const entityNameCases = ANOMALY_ENTITY_TYPES.map(
    (t) => `${t}_euid IS NOT NULL, ${ENTITY_NAME_FIELD[t]}`
  ).join(', ');
  parts.push(`| EVAL entity_name = CASE(${entityNameCases}, NULL)`);

  return `\n    ${parts.join('\n    ')}`;
};

/**
 * LOOKUP JOIN block that joins ML anomaly records with the entity store to filter by watchlist.
 * Requires entity_id to be computed first via getEuidEvaluationBlock().
 * Uses the entity store's entity.id field (EUID format) and filters by entity.attributes.watchlists.
 */
const getWatchlistJoinBlock = (watchlistName: string, spaceId: string) => `
    | EVAL entity.id = entity_id
    | RENAME @timestamp AS event_timestamp
    | LOOKUP JOIN ${getLatestEntitiesIndexName(spaceId)} ON entity.id
    | RENAME event_timestamp AS @timestamp
    | WHERE entity.attributes.watchlists == "${watchlistName}"`;

interface EsqlSourceParams {
  anomalyBands: AnomalyBand[];
  viewBy: ViewByMode;
  watchlistName?: string;
  spaceId?: string;
}

export const useRecentAnomaliesTopRowsEsqlSource = ({
  anomalyBands,
  rowsLimit,
  viewBy,
  watchlistName,
  spaceId,
}: EsqlSourceParams & { rowsLimit: number }): string | undefined => {
  const euidApi = useEntityStoreEuidApi();
  const needsWatchlistJoin = !!watchlistName && !!spaceId;

  if (!euidApi) return undefined;

  if (viewBy === 'jobId') {
    // Job ID mode with watchlist: need EUID eval + join to filter by watchlist entities,
    // then pivot by job_id
    if (needsWatchlistJoin) {
      return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL
    ${getEuidEvaluationBlock(euidApi.euid)}
    | WHERE entity_id IS NOT NULL
    ${getWatchlistJoinBlock(watchlistName, spaceId)}
    ${getHiddenBandsFilters(anomalyBands)}
    | STATS max_record_score = MAX(record_score) BY job_id
    | SORT max_record_score DESC
    | KEEP job_id
    | LIMIT ${rowsLimit}`;
    }

    // Job ID mode without watchlist: no EUID needed
    return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL
    ${getHiddenBandsFilters(anomalyBands)}
    | STATS max_record_score = MAX(record_score) BY job_id
    | SORT max_record_score DESC
    | KEEP job_id
    | LIMIT ${rowsLimit}`;
  }

  // Entity mode
  return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL
    ${getEuidEvaluationBlock(euidApi.euid)}
    | WHERE entity_id IS NOT NULL
    ${needsWatchlistJoin ? getWatchlistJoinBlock(watchlistName, spaceId) : ''}
    ${getHiddenBandsFilters(anomalyBands)}
    | STATS max_record_score = MAX(record_score), entity_name = VALUES(entity_name), entity_type = VALUES(entity_type) BY entity_id
    | EVAL entity_name = MV_FIRST(entity_name), entity_type = MV_FIRST(entity_type)
    | SORT max_record_score DESC
    | KEEP entity_id, entity_name, entity_type
    | LIMIT ${rowsLimit}`;
};

export const useRecentAnomaliesDataEsqlSource = ({
  anomalyBands,
  rowLabels,
  viewBy,
  watchlistName,
  spaceId,
}: EsqlSourceParams & { rowLabels?: string[] }) => {
  const euidApi = useEntityStoreEuidApi();
  const interval = useIntervalForHeatmap();
  const needsWatchlistJoin = !!watchlistName && !!spaceId;

  if (!euidApi || !rowLabels) return undefined;
  const formattedLabels = rowLabels.map((each) => `"${each}"`).join(', ');

  if (viewBy === 'jobId') {
    if (needsWatchlistJoin) {
      // Job ID mode with watchlist: need EUID eval + join, then pivot by job_id
      return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL AND job_id IN (${formattedLabels})
    ${getEuidEvaluationBlock(euidApi.euid)}
    | WHERE entity_id IS NOT NULL
    ${getWatchlistJoinBlock(watchlistName, spaceId)}
    ${getHiddenBandsFilters(anomalyBands)}
    | EVAL job_id_to_record_score = CONCAT(job_id, " : ", TO_STRING(record_score))
    | STATS job_id_to_record_score = VALUES(job_id_to_record_score) BY @timestamp = BUCKET(@timestamp, ${interval}h)
    | MV_EXPAND job_id_to_record_score
    | DISSECT job_id_to_record_score """%{job_id} : %{record_score}"""
    | EVAL record_score = TO_DOUBLE(record_score)
    | KEEP @timestamp, job_id, record_score
    | STATS record_score = MAX(record_score) BY @timestamp, job_id
    | SORT record_score DESC
`;
    }

    // Job ID mode without watchlist
    return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL AND job_id IN (${formattedLabels})
    ${getHiddenBandsFilters(anomalyBands)}
    | EVAL job_id_to_record_score = CONCAT(job_id, " : ", TO_STRING(record_score))
    | STATS job_id_to_record_score = VALUES(job_id_to_record_score) BY @timestamp = BUCKET(@timestamp, ${interval}h)
    | MV_EXPAND job_id_to_record_score
    | DISSECT job_id_to_record_score """%{job_id} : %{record_score}"""
    | EVAL record_score = TO_DOUBLE(record_score)
    | KEEP @timestamp, job_id, record_score
    | STATS record_score = MAX(record_score) BY @timestamp, job_id
    | SORT record_score DESC
`;
  }

  // Entity mode
  return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL
    ${getEuidEvaluationBlock(euidApi.euid)}
    | WHERE entity_id IN (${formattedLabels})
    ${needsWatchlistJoin ? getWatchlistJoinBlock(watchlistName, spaceId) : ''}
    ${getHiddenBandsFilters(anomalyBands)}
    | EVAL entity_id_to_record_score = CONCAT(entity_id, " : ", TO_STRING(record_score))
    | STATS entity_id_to_record_score = VALUES(entity_id_to_record_score) BY @timestamp = BUCKET(@timestamp, ${interval}h)
    | MV_EXPAND entity_id_to_record_score
    | DISSECT entity_id_to_record_score """%{entity_id} : %{record_score}"""
    | EVAL record_score = TO_DOUBLE(record_score)
    | KEEP @timestamp, entity_id, record_score
    | STATS record_score = MAX(record_score) BY @timestamp, entity_id
    | SORT record_score DESC
`;
};
