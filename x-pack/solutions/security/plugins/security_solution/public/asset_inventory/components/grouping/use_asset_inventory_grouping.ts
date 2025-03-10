/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  type GroupOption,
  type GroupingAggregation,
  type NamedAggregation,
  isNoneGroup,
  getGroupingQuery,
} from '@kbn/grouping';
import { parseGroupingQuery, type GroupPanelRenderer, type GetGroupStats } from '@kbn/grouping/src';
import { useMemo } from 'react';
import { buildEsQuery, type Filter } from '@kbn/es-query';

import { useDataViewContext } from '../../hooks/data_view_context';
import type { AssetsBaseURLQuery } from '../../hooks/use_asset_inventory_data_table';
import {
  ASSET_GROUPING_OPTIONS,
  ASSET_FIELDS,
  LOCAL_STORAGE_ASSETS_GROUPING_KEY,
} from '../../constants';

// TODO Copy-pasted from '@kbn/cloud-security-posture-plugin/public/components/use_cloud_security_grouping';
import { useCloudSecurityGrouping } from './use_cloud_security_grouping';
import {
  type AssetsGroupingAggregation,
  type AssetsRootGroupingAggregation,
  useGroupedAssets,
} from './use_grouped_assets';
import { assetsUnit, groupingTitle, assetGroupsUnit, GROUPING_LABELS } from './translations';

// TODO Remove?
export const ASSETS_GROUPING_RUNTIME_MAPPING_FIELDS: Record<string, string[]> = {};

// TODO Move to other file?
export const defaultGroupingOptions: GroupOption[] = [
  {
    label: GROUPING_LABELS.ASSET_TYPE,
    key: ASSET_GROUPING_OPTIONS.ASSET_TYPE,
  },
  {
    label: GROUPING_LABELS.ASSET_CATEGORY,
    key: ASSET_GROUPING_OPTIONS.ASSET_CATEGORY,
  },
  {
    label: GROUPING_LABELS.RISK,
    key: ASSET_GROUPING_OPTIONS.RISK,
  },
  {
    label: GROUPING_LABELS.CRITICALITY,
    key: ASSET_GROUPING_OPTIONS.CRITICALITY,
  },
];

// TODO Move to other file?
export const getDefaultQuery = ({
  query,
  filters,
}: AssetsBaseURLQuery): AssetsBaseURLQuery & {
  sort: string[][];
} => ({
  query,
  filters,
  sort: [[]],
  // TODO how to sort asset fields?
  // sort: [
  //   [ASSET_FIELDS.SEVERITY, 'asc'],
  //   [ASSET_FIELDS.SCORE_BASE, 'desc'],
  // ],
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
      // critical: {
      //   filter: {
      //     term: {
      //       'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.CRITICAL },
      //     },
      //   },
      // },
      // high: {
      //   filter: {
      //     term: {
      //       'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.HIGH },
      //     },
      //   },
      // },
      // medium: {
      //   filter: {
      //     term: {
      //       'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.MEDIUM },
      //     },
      //   },
      // },
      // low: {
      //   filter: {
      //     term: { 'vulnerability.severity': { value: VULNERABILITIES_SEVERITY.LOW } },
      //   },
      // },
    },
  ];

  switch (field) {
    case ASSET_GROUPING_OPTIONS.ASSET_TYPE:
      return [...aggMetrics, getTermAggregation('assetType', ASSET_FIELDS.ASSET_TYPE)];
    case ASSET_GROUPING_OPTIONS.ASSET_CATEGORY:
      return [...aggMetrics, getTermAggregation('assetCategory', ASSET_FIELDS.ASSET_CATEGORY)];
    case ASSET_GROUPING_OPTIONS.RISK:
      return [...aggMetrics, getTermAggregation('risk', ASSET_FIELDS.RISK)];
    case ASSET_GROUPING_OPTIONS.CRITICALITY:
      return [...aggMetrics, getTermAggregation('criticality', ASSET_FIELDS.CRITICALITY)];
    // case ASSET_GROUPING_OPTIONS.RESOURCE_NAME:
    //   return [...aggMetrics, getTermAggregation('resourceId', ASSET_FIELDS.RESOURCE_ID)];
    // case ASSET_GROUPING_OPTIONS.CLOUD_ACCOUNT_NAME:
    //   return [...aggMetrics, getTermAggregation('cloudProvider', ASSET_FIELDS.CLOUD_PROVIDER)];
    // case ASSET_GROUPING_OPTIONS.CVE:
    //   return [...aggMetrics, getTermAggregation('description', ASSET_FIELDS.DESCRIPTION)];
  }
  return aggMetrics;
};

/**
 * Get runtime mappings for the given group field
 * Some fields require additional runtime mappings to aggregate additional information
 * Fallback to keyword type to support custom fields grouping
 */
const getRuntimeMappingsByGroupField = (
  field: string
): Record<string, { type: 'keyword' }> | undefined => {
  if (ASSETS_GROUPING_RUNTIME_MAPPING_FIELDS?.[field]) {
    return ASSETS_GROUPING_RUNTIME_MAPPING_FIELDS[field].reduce(
      (acc, runtimeField) => ({
        ...acc,
        [runtimeField]: {
          type: 'keyword',
        },
      }),
      {}
    );
  }
  return {};
};

/**
 * Type Guard for checking if the given source is a AssetsRootGroupingAggregation
 */
export const isAssetsRootGroupingAggregation = (
  // TODO Replace any with correct type
  groupData: Record<string, any> | undefined // eslint-disable-line @typescript-eslint/no-explicit-any
): groupData is AssetsRootGroupingAggregation => {
  return groupData?.unitsCount?.value !== undefined;
};

/**
 * Utility hook to get the latest assets grouping data for the assets page
 */
export const useAssetInventoryGrouping = ({
  groupPanelRenderer,
  getGroupStats,
  groupingLevel = 0,
  groupFilters = [],
  selectedGroup,
}: {
  groupPanelRenderer?: GroupPanelRenderer<AssetsGroupingAggregation>;
  getGroupStats?: GetGroupStats<AssetsGroupingAggregation>;
  groupingLevel?: number;
  groupFilters?: Filter[];
  selectedGroup?: string;
}) => {
  const { dataView } = useDataViewContext();

  const {
    activePageIndex,
    grouping,
    pageSize,
    query,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    urlQuery,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
    onResetFilters,
    error,
    filters,
    setActivePageIndex,
  } = useCloudSecurityGrouping({
    dataView,
    groupingTitle,
    defaultGroupingOptions,
    getDefaultQuery,
    unit: assetsUnit,
    groupPanelRenderer,
    getGroupStats,
    groupingLocalStorageKey: LOCAL_STORAGE_ASSETS_GROUPING_KEY,
    groupingLevel,
    groupsUnit: assetGroupsUnit,
  });

  const additionalFilters = buildEsQuery(dataView, [], groupFilters);
  const currentSelectedGroup = selectedGroup || grouping.selectedGroups[0];

  const groupingQuery = getGroupingQuery({
    additionalFilters: query ? [query, additionalFilters] : [additionalFilters],
    groupByField: currentSelectedGroup,
    uniqueValue,
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ groupByField: { order: 'desc' } }],
    statsAggregations: getAggregationsByGroupField(currentSelectedGroup),
    runtimeMappings: getRuntimeMappingsByGroupField(currentSelectedGroup),
    rootAggregations: [
      {
        ...(!isNoneGroup([currentSelectedGroup]) && {
          nullGroupItems: {
            missing: { field: currentSelectedGroup },
          },
        }),
      },
    ],
  });

  const { data, isFetching } = useGroupedAssets({
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
    activePageIndex,
    setActivePageIndex,
    pageSize,
    selectedGroup,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    urlQuery,
    setUrlQuery,
    isGroupSelected: !isNoneSelected,
    isGroupLoading: !data,
    onResetFilters,
    filters,
    error,
    isEmptyResults,
  };
};
