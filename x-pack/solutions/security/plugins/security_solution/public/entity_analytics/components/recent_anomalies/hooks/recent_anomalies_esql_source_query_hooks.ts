/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_ANOMALIES_INDEX } from '../../../../../common/constants';
import { useIntervalForHeatmap } from '../anomaly_heatmap_interval';
import type { AnomalyBand } from '../anomaly_bands';
import { getHiddenBandsFilters } from '../hidden_bands_filter';
import { getLatestEntitiesIndexName } from '../../home/constants';

export type ViewByMode = 'entity' | 'jobId';

/**
 * EUID evaluation block for ES|QL queries on ML anomaly records.
 * Computes entity_id as a typed EUID (e.g. "user:alice", "host:server1", "service:api")
 * by checking user.name, host.name, and service.name fields from ML anomaly records.
 *
 * Note: We cannot use the `@kbn/entity-store` EUID helpers here because they depend on
 * `@kbn/streamlang` which is not available in browser code.
 */
const getEuidEvaluationBlock = () => `
    | EVAL user_euid = CASE(user.name IS NOT NULL AND user.name != "", CONCAT("user:", user.name), NULL)
    | EVAL host_euid = CASE(host.name IS NOT NULL AND host.name != "", CONCAT("host:", host.name), NULL)
    | EVAL service_euid = CASE(service.name IS NOT NULL AND service.name != "", CONCAT("service:", service.name), NULL)
    | EVAL entity_id = COALESCE(user_euid, host_euid, service_euid)`;

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
}: EsqlSourceParams & { rowsLimit: number }) => {
  const needsWatchlistJoin = !!watchlistName && !!spaceId;

  if (viewBy === 'jobId') {
    // Job ID mode with watchlist: need EUID eval + join to filter by watchlist entities,
    // then pivot by job_id
    if (needsWatchlistJoin) {
      return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL
    ${getEuidEvaluationBlock()}
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
    ${getEuidEvaluationBlock()}
    | WHERE entity_id IS NOT NULL
    ${needsWatchlistJoin ? getWatchlistJoinBlock(watchlistName, spaceId) : ''}
    ${getHiddenBandsFilters(anomalyBands)}
    | STATS max_record_score = MAX(record_score) BY entity_id
    | SORT max_record_score DESC
    | KEEP entity_id
    | LIMIT ${rowsLimit}`;
};

export const useRecentAnomaliesDataEsqlSource = ({
  anomalyBands,
  rowLabels,
  viewBy,
  watchlistName,
  spaceId,
}: EsqlSourceParams & { rowLabels?: string[] }) => {
  const interval = useIntervalForHeatmap();
  const needsWatchlistJoin = !!watchlistName && !!spaceId;

  if (!rowLabels) return undefined;
  const formattedLabels = rowLabels.map((each) => `"${each}"`).join(', ');

  if (viewBy === 'jobId') {
    if (needsWatchlistJoin) {
      // Job ID mode with watchlist: need EUID eval + join, then pivot by job_id
      return `SET unmapped_fields="nullify";
    FROM ${ML_ANOMALIES_INDEX}
    | WHERE record_score IS NOT NULL AND job_id IN (${formattedLabels})
    ${getEuidEvaluationBlock()}
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
    ${getEuidEvaluationBlock()}
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
