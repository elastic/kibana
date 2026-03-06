/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useMemo } from 'react';
import * as uuid from 'uuid';
import {
  type GroupOption,
  type GroupingAggregation,
  type NamedAggregation,
  isNoneGroup,
  getGroupingQuery,
  useGrouping,
} from '@kbn/grouping';
import { parseGroupingQuery } from '@kbn/grouping/src';
import { buildEsQuery, type Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import dedent from 'dedent';
import type { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import { DataViewContext } from '../index';
import type { EntityURLStateResult } from '../hooks/use_entity_url_state';
import {
  ENTITY_FIELDS,
  ENTITY_GROUPING_OPTIONS,
  ENTITY_TYPE_FILTER,
  LOCAL_STORAGE_GROUPING_KEY,
} from '../constants';
import { type EntitiesGroupingAggregation, useFetchGroupedData } from './use_fetch_grouped_data';
import { groupPanelRenderer, groupStatsRenderer } from './entity_group_renderer';

const MAX_GROUPING_LEVELS = 3;

const defaultGroupingOptions: GroupOption[] = [
  {
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.entitiesTable.groupBy.entityType',
      { defaultMessage: 'Entity type' }
    ),
    key: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
  },
];

const entitiesUnit = (totalCount: number) =>
  i18n.translate('xpack.securitySolution.entityAnalytics.entitiesTable.unit', {
    values: { totalCount },
    defaultMessage: '{totalCount, plural, =1 {entity} other {entities}}',
  });

const entitiesGroupsUnit = (totalCount: number, _selectedGroup: string, hasNullGroup: boolean) => {
  const groupCount = hasNullGroup ? totalCount - 1 : totalCount;
  return i18n.translate('xpack.securitySolution.entityAnalytics.entitiesTable.groupsUnit', {
    values: { groupCount, formattedGroupCount: groupCount.toLocaleString() },
    defaultMessage: '{formattedGroupCount} {groupCount, plural, =1 {group} other {groups}}',
  });
};

const groupingTitle = i18n.translate(
  'xpack.securitySolution.entityAnalytics.entitiesTable.groupBy',
  { defaultMessage: 'Group entities by' }
);

const getTermAggregation = (key: keyof EntitiesGroupingAggregation, field: string) => ({
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

  if (field === ENTITY_GROUPING_OPTIONS.ENTITY_TYPE) {
    return [...aggMetrics, getTermAggregation('entityType', ENTITY_FIELDS.ENTITY_TYPE)];
  }

  return aggMetrics;
};

export const useEntityGrouping = ({
  state,
  groupFilters = [],
  selectedGroup,
}: {
  state: EntityURLStateResult;
  groupFilters?: Filter[];
  selectedGroup?: string;
}) => {
  const { query, setUrlQuery, pageSize, pageIndex } = state;
  const { dataView, dataViewIsLoading } = useContext(DataViewContext);

  const grouping = useGrouping({
    componentProps: {
      unit: entitiesUnit,
      groupPanelRenderer,
      getGroupStats: groupStatsRenderer,
      groupsUnit: entitiesGroupsUnit,
    },
    defaultGroupingOptions,
    fields: dataViewIsLoading ? [] : dataView.fields,
    groupingId: LOCAL_STORAGE_GROUPING_KEY,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    title: groupingTitle,
    onGroupChange: ({ groupByFields }) => {
      setUrlQuery({
        groupBy: groupByFields,
      });
    },
  });

  const additionalFilters = buildEsQuery(dataView, [], groupFilters);
  const currentSelectedGroup = selectedGroup || grouping.selectedGroups[0];
  const isNoneSelected = isNoneGroup(grouping.selectedGroups);
  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  const groupingQuery = useMemo(
    () => ({
      ...getGroupingQuery({
        additionalFilters: query
          ? [query, additionalFilters, ENTITY_TYPE_FILTER]
          : [additionalFilters, ENTITY_TYPE_FILTER],
        groupByField: currentSelectedGroup,
        uniqueValue,
        pageNumber: pageIndex * pageSize,
        size: pageSize,
        sort: [{ groupByField: { order: 'desc' } }],
        statsAggregations: getAggregationsByGroupField(currentSelectedGroup),
        rootAggregations: [
          {
            ...(!isNoneGroup([currentSelectedGroup]) && {
              nullGroupItems: { missing: { field: currentSelectedGroup } },
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
          boolean treatAsUndefined = false;
          int count = groupValues.size();
          treatAsUndefined = (count == 0 || count > 100);
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
        data as GroupingAggregation<EntitiesGroupingAggregation>
      ),
    [data, currentSelectedGroup, uniqueValue]
  );

  const isEmptyResults =
    !isFetching && 'unitsCount' in groupData && groupData.unitsCount?.value === 0;

  return {
    groupData,
    grouping,
    isFetching,
    selectedGroup,
    isGroupSelected: !isNoneSelected,
    isEmptyResults,
  };
};
