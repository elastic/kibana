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
import { parseGroupingQuery, MAX_QUERY_SIZE } from '@kbn/grouping/src';
import { buildEsQuery, type Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import dedent from 'dedent';
import type { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { useGlobalFilterQuery } from '../../../../../common/hooks/use_global_filter_query';
import { DataViewContext } from '..';
import type { EntityURLStateResult } from '../hooks/use_entity_url_state';
import {
  ENTITY_FIELDS,
  ENTITY_GROUPING_OPTIONS,
  ENTITY_TYPE_FILTER,
  LOCAL_STORAGE_GROUPING_KEY,
} from '../constants';
import {
  type EntitiesGroupingAggregation,
  type EntitiesGroupingQuery,
  useFetchGroupedData,
} from './use_fetch_grouped_data';
import { groupPanelRenderer, groupStatsRenderer } from './entity_group_renderer';

const MAX_GROUPING_LEVELS = 3;

const defaultGroupingOptions: GroupOption[] = [
  {
    label: i18n.translate(
      'xpack.securitySolution.entityAnalytics.entitiesTable.groupBy.resolution',
      { defaultMessage: 'Resolution' }
    ),
    key: ENTITY_GROUPING_OPTIONS.RESOLUTION,
  },
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

export const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
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

export const buildResolutionGroupingQuery = ({
  filters,
  pageIndex,
  pageSize,
}: {
  filters: ESBoolQuery[];
  pageIndex: number;
  pageSize: number;
}): EntitiesGroupingQuery => ({
  size: 0,
  runtime_mappings: {
    groupByField: {
      type: 'keyword' as MappingRuntimeFieldType,
      script: {
        source: dedent(`
          if (doc.containsKey('${ENTITY_FIELDS.RESOLVED_TO}')
              && !doc['${ENTITY_FIELDS.RESOLVED_TO}'].empty) {
            emit(doc['${ENTITY_FIELDS.RESOLVED_TO}'].value);
          } else if (doc.containsKey('${ENTITY_FIELDS.ENTITY_ID}')
              && !doc['${ENTITY_FIELDS.ENTITY_ID}'].empty) {
            emit(doc['${ENTITY_FIELDS.ENTITY_ID}'].value);
          }
        `),
      },
    },
  },
  aggs: {
    groupByFields: {
      terms: {
        field: 'groupByField',
        size: MAX_QUERY_SIZE,
        order: [{ resolutionRiskScore: 'desc' as const }, { _count: 'desc' as const }],
      },
      aggs: {
        resolutionRiskScore: {
          max: { field: ENTITY_FIELDS.RESOLUTION_RISK_SCORE },
        },
        resolutionEntityName: {
          filter: {
            bool: {
              must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
            },
          },
          aggs: {
            name: { terms: { field: ENTITY_FIELDS.ENTITY_NAME, size: 1 } },
          },
        },
        resolutionEntityType: {
          filter: {
            bool: {
              must_not: [{ exists: { field: ENTITY_FIELDS.RESOLVED_TO } }],
            },
          },
          aggs: {
            type: { terms: { field: ENTITY_FIELDS.ENTITY_TYPE, size: 1 } },
          },
        },
        bucket_truncate: {
          bucket_sort: {
            from: pageIndex * pageSize,
            size: pageSize,
          },
        },
      },
    },
    unitsCount: { value_count: { field: 'groupByField' } },
    groupsCount: { cardinality: { field: 'groupByField' } },
  },
  query: {
    bool: {
      filter: filters,
    },
  },
  _source: false,
});

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
  const { filterQuery: globalFilterQuery } = useGlobalFilterQuery();

  const grouping = useGrouping({
    componentProps: {
      unit: entitiesUnit,
      groupPanelRenderer,
      getGroupStats: groupStatsRenderer,
      groupsUnit: entitiesGroupsUnit,
    },
    defaultGroupingOptions,
    initialGroupings: {
      groupById: {
        [LOCAL_STORAGE_GROUPING_KEY]: {
          activeGroups: [ENTITY_GROUPING_OPTIONS.RESOLUTION],
          options: defaultGroupingOptions,
        },
      },
    },
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
  const isResolutionGrouping = currentSelectedGroup === ENTITY_GROUPING_OPTIONS.RESOLUTION;
  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  const groupingQuery = useMemo(() => {
    const allFilters = [
      ...(query ? [query] : []),
      additionalFilters,
      ENTITY_TYPE_FILTER,
      ...(globalFilterQuery ? [globalFilterQuery] : []),
    ];

    if (isResolutionGrouping) {
      return buildResolutionGroupingQuery({
        filters: allFilters,
        pageIndex,
        pageSize,
      });
    }

    return {
      ...getGroupingQuery({
        additionalFilters: allFilters,
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
    };
  }, [
    currentSelectedGroup,
    isResolutionGrouping,
    uniqueValue,
    additionalFilters,
    query,
    pageIndex,
    pageSize,
    globalFilterQuery,
  ]);

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
