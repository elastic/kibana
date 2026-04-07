/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchRequest, SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse } from '@kbn/search-types';
import type { GenericBuckets, GroupingQuery, RootAggregation } from '@kbn/grouping/src';
import { useQuery } from '@kbn/react-query';
import { lastValueFrom } from 'rxjs';
import { showErrorToast } from '@kbn/cloud-security-posture';
import { useContext, useMemo } from 'react';
import type { EntityType } from '../../../../../../common/entity_analytics/types';
import { useKibana } from '../../../../../common/lib/kibana';
import { ENTITY_FIELDS, QUERY_KEY_GROUPING_DATA, QUERY_KEY_ENTITY_ANALYTICS } from '../constants';
import { DataViewContext } from '..';

export type EntitiesGroupingQuery = GroupingQuery | SearchRequest;

export interface EntitiesGroupingAggregation {
  entityType?: {
    buckets?: GenericBuckets[];
  };
  resolutionRiskScore?: {
    value: number | null;
  };
}

export interface TargetEntityMetadata {
  name: string;
  type: EntityType;
}

export type TargetMetadataMap = Map<string, TargetEntityMetadata>;

export type EntitiesRootGroupingAggregation = RootAggregation<EntitiesGroupingAggregation>;

export const getGroupedEntitiesQuery = (query: EntitiesGroupingQuery, indexPattern: string) => {
  return {
    ...query,
    index: indexPattern,
    ignore_unavailable: true,
    size: 0,
  };
};

export const useFetchGroupedData = ({
  query,
  enabled = true,
}: {
  query: EntitiesGroupingQuery;
  enabled: boolean;
}) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useContext(DataViewContext);

  const dataViewIndexPattern = useMemo(() => {
    return dataView?.getIndexPattern();
  }, [dataView]);

  return useQuery(
    [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_GROUPING_DATA, { query }],
    async () => {
      const {
        rawResponse: { aggregations },
      } = await lastValueFrom(
        data.search.search<
          {},
          IKibanaSearchResponse<SearchResponse<{}, EntitiesRootGroupingAggregation>>
        >({
          params: getGroupedEntitiesQuery(query, dataViewIndexPattern),
        })
      );

      if (!aggregations) throw new Error('Failed to aggregate by, missing resource id');

      return aggregations;
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: enabled && !!dataViewIndexPattern,
      keepPreviousData: true,
    }
  );
};

const QUERY_KEY_TARGET_METADATA = 'entity-analytics-target-metadata';

export const useFetchTargetMetadata = (entityIds: string[]): TargetMetadataMap => {
  const {
    data,
    notifications: { toasts },
  } = useKibana().services;

  const { dataView } = useContext(DataViewContext);

  const dataViewIndexPattern = useMemo(() => {
    return dataView?.getIndexPattern();
  }, [dataView]);

  const { data: metadataMap } = useQuery(
    [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_TARGET_METADATA, entityIds],
    async () => {
      const {
        rawResponse: { hits },
      } = await lastValueFrom(
        data.search.search<{}, IKibanaSearchResponse<SearchResponse>>({
          params: {
            index: dataViewIndexPattern,
            ignore_unavailable: true,
            size: entityIds.length,
            _source: [
              ENTITY_FIELDS.ENTITY_ID,
              ENTITY_FIELDS.ENTITY_NAME,
              ENTITY_FIELDS.ENTITY_TYPE,
            ],
            query: {
              bool: {
                filter: [{ terms: { [ENTITY_FIELDS.ENTITY_ID]: entityIds } }],
                must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
              },
            },
          },
        })
      );

      const result: TargetMetadataMap = new Map();
      for (const hit of hits.hits) {
        const source = hit._source as Record<string, unknown> | undefined;
        if (source) {
          const entity = source.entity as Record<string, unknown> | undefined;
          if (entity) {
            const id = entity.id as string | undefined;
            const name = entity.name as string | undefined;

            const engineMetadata = entity.EngineMetadata as Record<string, unknown> | undefined;
            const type = engineMetadata?.Type as EntityType | undefined;

            if (id && name && type) {
              result.set(id, { name, type });
            }
          }
        }
      }

      return result;
    },
    {
      onError: (err: Error) => showErrorToast(toasts, err),
      enabled: entityIds.length > 0 && !!dataViewIndexPattern,
      keepPreviousData: true,
    }
  );

  return metadataMap ?? new Map();
};
