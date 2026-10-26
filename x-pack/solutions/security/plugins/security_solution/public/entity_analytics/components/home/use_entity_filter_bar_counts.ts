/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type {
  AggregationsStringTermsAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import {
  CriticalityLevelsForBulkUpload,
  ValidCriticalityLevels,
} from '../../../../common/entity_analytics/asset_criticality/constants';
import { RiskSeverity } from '../../../../common/search_strategy';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import { useKibana } from '../../../common/lib/kibana';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { useResolvedLatestEntitiesIndexName } from '../../../common/hooks/use_resolved_latest_entities_index_name';
import { getEntitiesAlias, ENTITY_LATEST } from './constants';
import { CRITICALITY_FIELD, RESOLUTION_RISK_LEVEL_FIELD } from './entities_grid/common';
import type { RowsMode } from './entities_grid/common';
import { useSearchBarExpression } from './entities_grid/hooks/use_search_bar_expression';
import { createEsqlRunner } from './entities_grid/queries/esql';
import { fetchResolvedEntityValueChanges } from './entities_grid/queries/resolved_entities';
import type { ResolvedEntityValueChange } from './entities_grid/queries/resolved_entities';

export interface EntityFilterBarCounts {
  entity_types: Record<string, number>;
  risk_levels: Record<string, number>;
  asset_criticality: Record<string, number>;
  watchlists: Record<string, number>;
  data_sources: Record<string, number>;
}

const EMPTY_FILTER_COUNTS: EntityFilterBarCounts = {
  entity_types: {},
  risk_levels: {},
  asset_criticality: {},
  watchlists: {},
  data_sources: {},
};

export const toBucketMap = (
  raw: Partial<AggregationsStringTermsAggregate> | undefined
): Record<string, number> => {
  const buckets = Array.isArray(raw?.buckets) ? raw.buckets : [];
  return Object.fromEntries(buckets.map(({ key, doc_count }) => [key, doc_count]));
};

const ENTITY_TYPE_COUNT = getEntityAnalyticsEntityTypes().length;

const RISK_LEVEL_TERMS = {
  field: 'entity.risk.calculated_level',
  size: SEVERITY_UI_SORT_ORDER.length,
  missing: RiskSeverity.Unknown,
};

/** A resolved entity's risk level is its group's, else its own: both are stored on its doc. */
const buildRiskLevelAggs = (rowsMode: RowsMode) =>
  rowsMode === 'resolved'
    ? {
        risk_levels: {
          filter: { bool: { must_not: { exists: { field: RESOLUTION_RISK_LEVEL_FIELD } } } },
          aggs: { levels: { terms: RISK_LEVEL_TERMS } },
        },
        group_risk_levels: {
          filter: { exists: { field: RESOLUTION_RISK_LEVEL_FIELD } },
          aggs: {
            levels: {
              terms: { field: RESOLUTION_RISK_LEVEL_FIELD, size: SEVERITY_UI_SORT_ORDER.length },
            },
          },
        },
      }
    : { risk_levels: { terms: RISK_LEVEL_TERMS } };

const getResolvedRowsFilter = (rowsMode: RowsMode) =>
  rowsMode === 'resolved'
    ? [
        {
          bool: {
            must_not: {
              exists: { field: 'entity.relationships.resolution.resolved_to' },
            },
          },
        },
      ]
    : [];

export const buildEntityFilterCountsRequest = ({
  spaceId,
  rowsMode,
  filter,
}: {
  spaceId: string;
  rowsMode: RowsMode;
  filter?: QueryDslQueryContainer;
}) => ({
  index: [getEntitiesAlias(ENTITY_LATEST, spaceId)],
  size: 0,
  query: {
    bool: {
      filter: [
        { terms: { 'entity.EngineMetadata.Type': getEntityAnalyticsEntityTypes() } },
        ...(filter ? [filter] : []),
        ...getResolvedRowsFilter(rowsMode),
      ],
    },
  },
  aggs: {
    entity_types: { terms: { field: 'entity.EngineMetadata.Type', size: ENTITY_TYPE_COUNT } },
    ...buildRiskLevelAggs(rowsMode),
    asset_criticality: {
      terms: {
        field: 'asset.criticality',
        size: ValidCriticalityLevels.length,
        missing: CriticalityLevelsForBulkUpload.UNASSIGNED,
      },
    },
    watchlists: { terms: { field: 'entity.attributes.watchlists', size: 200 } },
    data_sources: { terms: { field: 'entity.source', size: 200 } },
  },
});

/** A terms aggregation, or a filter one holding its terms under `levels`. */
type FilterCountsAggregate = Partial<AggregationsStringTermsAggregate> & {
  levels?: AggregationsStringTermsAggregate;
};

const addCounts = (a: Record<string, number>, b: Record<string, number>): Record<string, number> =>
  Object.entries(b).reduce((sum, [key, count]) => ({ ...sum, [key]: (sum[key] ?? 0) + count }), a);

export const parseEntityFilterCountsResponse = (
  aggs: Record<string, FilterCountsAggregate> | undefined
): EntityFilterBarCounts => ({
  entity_types: toBucketMap(aggs?.entity_types),
  risk_levels: addCounts(
    toBucketMap(aggs?.risk_levels?.levels ?? aggs?.risk_levels),
    toBucketMap(aggs?.group_risk_levels?.levels)
  ),
  asset_criticality: toBucketMap(aggs?.asset_criticality),
  watchlists: toBucketMap(aggs?.watchlists),
  data_sources: toBucketMap(aggs?.data_sources),
});

const COUNTS_OF_FIELD: Record<string, 'asset_criticality' | 'data_sources' | 'watchlists'> = {
  [CRITICALITY_FIELD]: 'asset_criticality',
  'entity.source': 'data_sources',
  'entity.attributes.watchlists': 'watchlists',
};

/** Resolved rows show their group's values, so counts move from main entities' own values to them. */
export const applyResolvedEntityValueChanges = (
  counts: EntityFilterBarCounts,
  changes: readonly ResolvedEntityValueChange[]
): EntityFilterBarCounts => {
  const next = {
    ...counts,
    asset_criticality: { ...counts.asset_criticality },
    data_sources: { ...counts.data_sources },
    watchlists: { ...counts.watchlists },
  };
  for (const { field, value, change } of changes) {
    const key = COUNTS_OF_FIELD[field];
    // As in the counts, an entity without a criticality counts as unassigned.
    const bucket =
      value ?? (field === CRITICALITY_FIELD ? CriticalityLevelsForBulkUpload.UNASSIGNED : null);
    if (key && bucket != null) {
      // The counts and the changes are two reads, so data changed between them can't go below 0.
      next[key][bucket] = Math.max(0, (next[key][bucket] ?? 0) + change);
    }
  }
  return next;
};

interface UseEntityFilterBarCountsResult {
  counts: EntityFilterBarCounts;
  /** No counts yet. */
  isLoading: boolean;
  /** The counts shown may be from before the last change. */
  isFetching: boolean;
}

export const useEntityFilterBarCounts = ({
  spaceId,
  rowsMode,
  filter,
}: {
  spaceId: string | undefined;
  rowsMode: RowsMode;
  filter?: QueryDslQueryContainer;
}): UseEntityFilterBarCountsResult => {
  const { data: dataServices } = useKibana().services;
  const searchExpression = useSearchBarExpression();
  const { data: resolvedIndex } = useResolvedLatestEntitiesIndexName(spaceId);
  const concreteEntityIndexName = resolvedIndex?.indexName;

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['entity-filter-aggregations', spaceId, rowsMode, filter],
    enabled: !!spaceId,
    keepPreviousData: true,
    queryFn: async (): Promise<EntityFilterBarCounts> => {
      const { rawResponse } = await lastValueFrom(
        dataServices.search.search({
          params: buildEntityFilterCountsRequest({ spaceId: spaceId as string, rowsMode, filter }),
        })
      );
      return parseEntityFilterCountsResponse(
        rawResponse.aggregations as Record<string, FilterCountsAggregate> | undefined
      );
    },
  });

  const isResolved = rowsMode === 'resolved';
  const {
    data: changes,
    isInitialLoading: isChangesLoading,
    isFetching: isChangesFetching,
    error: changesError,
  } = useQuery({
    queryKey: ['entity-filter-value-changes', spaceId, concreteEntityIndexName, searchExpression],
    enabled: isResolved && !!spaceId && !!concreteEntityIndexName,
    keepPreviousData: true,
    queryFn: ({ signal }) =>
      fetchResolvedEntityValueChanges(
        {
          namespace: spaceId as string,
          concreteEntityIndexName: concreteEntityIndexName as string,
          searchExpression,
        },
        createEsqlRunner(dataServices.search, signal)
      ),
  });

  const counts = useMemo(() => {
    const ownCounts = data ?? EMPTY_FILTER_COUNTS;
    return isResolved && changes ? applyResolvedEntityValueChanges(ownCounts, changes) : ownCounts;
  }, [data, changes, isResolved]);

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.filterCounts.queryError', {
      defaultMessage: 'There was an error loading entity filter counts',
    }),
    error ?? changesError
  );

  return {
    counts,
    isLoading: isLoading || (isResolved && isChangesLoading),
    isFetching: isFetching || (isResolved && isChangesFetching),
  };
};
