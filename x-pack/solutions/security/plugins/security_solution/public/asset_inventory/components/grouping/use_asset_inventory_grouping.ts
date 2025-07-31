/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo } from 'react';
import * as uuid from 'uuid';
import {
  type GroupOption,
  type GroupingAggregation,
  type NamedAggregation,
  isNoneGroup,
  getGroupingQuery,
  useGrouping,
} from '@kbn/grouping';
import { type ParsedGroupingAggregation, parseGroupingQuery } from '@kbn/grouping/src';
import { buildEsQuery, type Filter } from '@kbn/es-query';
import {
  GROUP_BY_CLICK,
  uiMetricService,
} from '@kbn/cloud-security-posture-common/utils/ui_metrics';
import { METRIC_TYPE } from '@kbn/analytics';

import dedent from 'dedent';
import type { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import { useDataViewContext } from '../../hooks/data_view_context';
import type {
  AssetInventoryURLStateResult,
  AssetsBaseURLQuery,
} from '../../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import {
  ASSET_GROUPING_OPTIONS,
  ASSET_FIELDS,
  LOCAL_STORAGE_ASSETS_GROUPING_KEY,
} from '../../constants';
import { groupPanelRenderer, groupStatsRenderer } from './utils/asset_inventory_group_renderer';
import { type AssetsGroupingAggregation, useFetchGroupedData } from './use_fetch_grouped_data';
import { assetsUnit, groupingTitle, assetGroupsUnit, GROUPING_LABELS } from './translations';

const MAX_GROUPING_LEVELS = 3;

const defaultGroupingOptions: GroupOption[] = [
  {
    label: GROUPING_LABELS.ASSET_CRITICALITY,
    key: ASSET_GROUPING_OPTIONS.ASSET_CRITICALITY,
  },
  {
    label: GROUPING_LABELS.ENTITY_TYPE,
    key: ASSET_GROUPING_OPTIONS.ENTITY_TYPE,
  },
  {
    label: GROUPING_LABELS.CLOUD_ACCOUNT,
    key: ASSET_GROUPING_OPTIONS.CLOUD_ACCOUNT,
  },
];

export const getDefaultQuery = ({
  query,
  filters,
  pageFilters,
}: AssetsBaseURLQuery): AssetsBaseURLQuery & {
  sort: string[][];
} => ({
  query,
  filters,
  pageFilters: [],
  sort: [[]],
});

const getTermAggregation = (key: keyof AssetsGroupingAggregation, field: string) => ({
  [key]: {
    terms: { field, size: 1 },
  },
});

const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
  if (isNoneGroup([field])) {
    return [];
  }
  const aggMetrics: NamedAggregation[] = [
    {
      groupByField: {
        cardinality: {
          field,
        },
      },
    },
  ];

  switch (field) {
    case ASSET_GROUPING_OPTIONS.ASSET_CRITICALITY:
      return [
        ...aggMetrics,
        getTermAggregation('assetCriticality', ASSET_FIELDS.ASSET_CRITICALITY),
      ];
    case ASSET_GROUPING_OPTIONS.ENTITY_TYPE:
      return [...aggMetrics, getTermAggregation('entityType', ASSET_FIELDS.ENTITY_TYPE)];
    case ASSET_GROUPING_OPTIONS.CLOUD_ACCOUNT:
      return [
        ...aggMetrics,
        getTermAggregation('accountId', ASSET_FIELDS.CLOUD_ACCOUNT_ID),
        getTermAggregation('accountName', ASSET_FIELDS.CLOUD_ACCOUNT_NAME),
        getTermAggregation('cloudProvider', ASSET_FIELDS.CLOUD_PROVIDER),
      ];
  }
  return aggMetrics;
};

/**
 * Type Guard for checking if the given source is a AssetsRootGroupingAggregation
 */
export const isAssetsRootGroupingAggregation = (
  groupData: {} | ParsedGroupingAggregation<AssetsGroupingAggregation>
): groupData is ParsedGroupingAggregation<AssetsGroupingAggregation> => {
  return (
    typeof groupData === 'object' &&
    'unitsCount' in groupData &&
    groupData.unitsCount?.value !== undefined
  );
};

/**
 * Utility hook to get the latest assets grouping data for the assets page
 */
export const useAssetInventoryGrouping = ({
  state,
  groupFilters = [],
  selectedGroup,
}: {
  state: AssetInventoryURLStateResult;
  groupFilters?: Filter[];
  selectedGroup?: string;
}) => {
  const { query, setUrlQuery, pageSize, pageIndex } = state;
  const { dataView, dataViewIsLoading } = useDataViewContext();

  const grouping = useGrouping({
    componentProps: {
      unit: assetsUnit,
      groupPanelRenderer,
      getGroupStats: groupStatsRenderer,
      groupsUnit: assetGroupsUnit,
    },
    defaultGroupingOptions,
    fields: dataViewIsLoading ? [] : dataView.fields,
    groupingId: LOCAL_STORAGE_ASSETS_GROUPING_KEY,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    title: groupingTitle,
    onGroupChange: ({ groupByFields }) => {
      setUrlQuery({
        groupBy: groupByFields,
      });
      uiMetricService.trackUiMetric(METRIC_TYPE.CLICK, GROUP_BY_CLICK);
    },
  });

  const additionalFilters = buildEsQuery(dataView, [], groupFilters);
  const currentSelectedGroup = selectedGroup || grouping.selectedGroups[0];
  const isNoneSelected = isNoneGroup(grouping.selectedGroups);
  // This is recommended by the grouping component to cover an edge case where `selectedGroup` has multiple values
  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  const groupingQuery = useMemo(
    () => ({
      ...getGroupingQuery({
        additionalFilters: query ? [query, additionalFilters] : [additionalFilters],
        groupByField: currentSelectedGroup,
        uniqueValue,
        pageNumber: pageIndex * pageSize,
        size: pageSize,
        sort: [{ groupByField: { order: 'desc' } }],
        statsAggregations: getAggregationsByGroupField(currentSelectedGroup),
        rootAggregations: [
          {
            ...(!isNoneGroup([currentSelectedGroup]) && {
              nullGroupItems:
                currentSelectedGroup === ASSET_FIELDS.ASSET_CRITICALITY
                  ? {
                      filter: {
                        bool: {
                          should: [
                            { term: { [ASSET_FIELDS.ASSET_CRITICALITY]: 'deleted' } },
                            {
                              bool: {
                                must_not: { exists: { field: ASSET_FIELDS.ASSET_CRITICALITY } },
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                    }
                  : { missing: { field: currentSelectedGroup } },
            }),
          },
        ],
      }),
      runtime_mappings: {
        groupByField: {
          type: 'keyword' as MappingRuntimeFieldType,
          script: {
            source: dedent(`
          def groupValues = [];
          if (doc.containsKey(params['selectedGroup']) && !doc[params['selectedGroup']].empty) {
            groupValues = doc[params['selectedGroup']];
          }
          // If selectedGroup is 'asset.criticality', treat 'deleted' as undefined group
          boolean treatAsUndefined = false;
          int count = groupValues.size();
          if (params['selectedGroup'] == 'asset.criticality') {
            boolean isDeleted = false;
            for (def v : groupValues) {
              if (v == 'deleted') {
                isDeleted = true;
                break;
              }
            }
            treatAsUndefined = (count == 0 || count > 100 || isDeleted);
          } else {
            treatAsUndefined = (count == 0 || count > 100);
          }
          if (treatAsUndefined) {
            emit(params['uniqueValue']);
          } else {
            emit(groupValues.join(params['uniqueValue']));
          }
        `),
            params: {
              selectedGroup: currentSelectedGroup,
              uniqueValue,
            },
          },
        },
      },
    }),
    [currentSelectedGroup, uniqueValue, additionalFilters, query, pageIndex, pageSize]
  );

  const { data, isFetching } = useFetchGroupedData({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const groupData = useMemo(
    () =>
      parseGroupingQuery(
        currentSelectedGroup,
        uniqueValue,
        data as GroupingAggregation<AssetsGroupingAggregation>
      ),
    [data, currentSelectedGroup, uniqueValue]
  );

  const isEmptyResults =
    !isFetching && isAssetsRootGroupingAggregation(groupData) && groupData.unitsCount?.value === 0;

  return {
    groupData,
    grouping,
    isFetching,
    selectedGroup,
    isGroupSelected: !isNoneSelected,
    isEmptyResults,
  };
};
