/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import type {
  AggregationsStringTermsAggregate,
  QueryDslQueryContainer,
} from '@elastic/elasticsearch/lib/api/types';
import { SEVERITY_UI_SORT_ORDER } from '../../common/utils';
import { ValidCriticalityLevels } from '../../../../common/entity_analytics/asset_criticality/constants';
import { getEntityAnalyticsEntityTypes } from '../../../../common/entity_analytics/utils';
import { useKibana } from '../../../common/lib/kibana';
import { useErrorToast } from '../../../common/hooks/use_error_toast';
import { getEntitiesAlias, ENTITY_LATEST } from './constants';

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
  raw: AggregationsStringTermsAggregate | undefined
): Record<string, number> => {
  const buckets = Array.isArray(raw?.buckets) ? raw.buckets : [];
  return Object.fromEntries(buckets.map(({ key, doc_count }) => [key, doc_count]));
};

const ENTITY_TYPE_COUNT = getEntityAnalyticsEntityTypes().length;

const getResolvedViewFilter = (view: 'resolved' | 'raw') =>
  view === 'resolved'
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

export const useEntityFilterBarCounts = ({
  spaceId,
  view,
  filter,
}: {
  spaceId: string | undefined;
  view: 'resolved' | 'raw';
  filter?: QueryDslQueryContainer;
}): EntityFilterBarCounts => {
  const { data: dataServices } = useKibana().services;

  const { data, error } = useQuery({
    queryKey: ['entity-filter-aggregations', spaceId, view, filter],
    enabled: !!spaceId,
    keepPreviousData: true,
    queryFn: async (): Promise<EntityFilterBarCounts> => {
      const index = getEntitiesAlias(ENTITY_LATEST, spaceId as string);

      const { rawResponse } = await lastValueFrom(
        dataServices.search.search({
          params: {
            index: [index],
            size: 0,
            query: {
              bool: {
                filter: [
                  { terms: { 'entity.EngineMetadata.Type': getEntityAnalyticsEntityTypes() } },
                  ...(filter ? [filter] : []),
                  ...getResolvedViewFilter(view),
                ],
              },
            },
            aggs: {
              entity_types: {
                terms: { field: 'entity.EngineMetadata.Type', size: ENTITY_TYPE_COUNT },
              },
              risk_levels: {
                terms: {
                  field: 'entity.risk.calculated_level',
                  size: SEVERITY_UI_SORT_ORDER.length,
                },
              },
              asset_criticality: {
                terms: { field: 'asset.criticality', size: ValidCriticalityLevels.length },
              },
              watchlists: { terms: { field: 'entity.attributes.watchlists', size: 200 } },
              data_sources: { terms: { field: 'entity.source', size: 200 } },
            },
          },
        })
      );

      const aggs = rawResponse.aggregations as
        | Record<string, AggregationsStringTermsAggregate>
        | undefined;

      return {
        entity_types: toBucketMap(aggs?.entity_types),
        risk_levels: toBucketMap(aggs?.risk_levels),
        asset_criticality: toBucketMap(aggs?.asset_criticality),
        watchlists: toBucketMap(aggs?.watchlists),
        data_sources: toBucketMap(aggs?.data_sources),
      };
    },
  });

  useErrorToast(
    i18n.translate('xpack.securitySolution.entityAnalytics.home.filterCounts.queryError', {
      defaultMessage: 'There was an error loading entity filter counts',
    }),
    error
  );

  return data ?? EMPTY_FILTER_COUNTS;
};
