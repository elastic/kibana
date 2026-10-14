/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useContext, useEffect, useMemo } from 'react';
import * as uuid from 'uuid';
import {
  type GroupOption,
  type GroupingAggregation,
  type NamedAggregation,
  isNoneGroup,
  getGroupingQuery,
  useGrouping,
} from '@kbn/grouping';
import { parseGroupingQuery, type ParsedGroupingAggregation } from '@kbn/grouping/src';
import { buildEsQuery, type Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';

import dedent from 'dedent';
import type { MappingRuntimeFieldType } from '@elastic/elasticsearch/lib/api/types';
import type { ESBoolQuery } from '../../../../../../common/typed_json';
import { DataViewContext } from '..';
import type { EntityURLStateResult } from '../hooks/use_entity_url_state';
import {
  ALLOWED_ENTITY_TYPES,
  ENTITY_FIELDS,
  ENTITY_GROUPING_OPTIONS,
  ENTITY_TYPE_FILTER,
} from '../constants';
import { hasActiveTopLevelBoolClauses } from '../utils';
import {
  type EntitiesGroupingAggregation,
  type EntitiesGroupingQuery,
  type TargetMetadataMap,
  useFetchFilteredResolutionGroupData,
  useFetchGroupedData,
  useFetchUnfilteredResolutionGroupData,
} from './use_fetch_grouped_data';
import { createGroupPanelRenderer, createGroupStatsRenderer } from './entity_group_renderer';
import { useHasEntityResolutionLicense } from '../../../../../common/hooks/use_has_entity_resolution_license';

const MAX_GROUPING_LEVELS = 3;

const EMPTY_TARGET_METADATA: TargetMetadataMap = new Map();

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

export const useEntityGrouping = ({
  state,
  groupFilters = [],
  selectedGroup,
  tableId,
  groupingId,
}: {
  state: EntityURLStateResult;
  groupFilters?: Filter[];
  selectedGroup?: string;
  /** Forwarded to `createGroupPanelRenderer` so resolution group flyouts open in the right scope. */
  tableId: string;
  /**
   * Identifier used by `@kbn/grouping` to persist the active grouping
   * selection. Required so independent mounts (e.g. the cases attachments
   * accordion) pass their own and grouping state doesn't leak between tables.
   */
  groupingId: string;
}) => {
  const { query, setUrlQuery, pageSize, pageIndex } = state;
  const { dataView, dataViewIsLoading } = useContext(DataViewContext);
  const hasResolutionLicense = useHasEntityResolutionLicense();

  const defaultGroupingOptions = useMemo<GroupOption[]>(() => {
    const resolutionOption: GroupOption = {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entitiesTable.groupBy.resolution',
        { defaultMessage: 'Resolution' }
      ),
      key: ENTITY_GROUPING_OPTIONS.RESOLUTION,
    };
    const entityTypeOption: GroupOption = {
      label: i18n.translate(
        'xpack.securitySolution.entityAnalytics.entitiesTable.groupBy.entityType',
        { defaultMessage: 'Entity type' }
      ),
      key: ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
    };
    if (hasResolutionLicense) {
      return [resolutionOption, entityTypeOption];
    }
    return [entityTypeOption];
  }, [hasResolutionLicense]);

  const initialGroupings = useMemo(
    () => ({
      groupById: {
        [groupingId]: {
          activeGroups: hasResolutionLicense
            ? [ENTITY_GROUPING_OPTIONS.RESOLUTION]
            : [ENTITY_GROUPING_OPTIONS.NONE],
          options: defaultGroupingOptions,
        },
      },
    }),
    [defaultGroupingOptions, hasResolutionLicense, groupingId]
  );

  // Memoized so the downstream filteredResolutionFilter / nonResolutionGroupingQuery memos aren't
  // defeated by buildEsQuery returning a fresh object reference on every render.
  const additionalFilters = useMemo(
    () => buildEsQuery(dataView, [], groupFilters),
    [dataView, groupFilters]
  );
  const isResolutionGrouping = selectedGroup === ENTITY_GROUPING_OPTIONS.RESOLUTION;
  const uniqueValue = useMemo(() => `${selectedGroup}-${uuid.v4()}`, [selectedGroup]);

  // The fast target-only query is valid without filters. Filtered grouping requires a STATS join
  // so a match on an alias still surfaces its target group.
  const isUserFilterActive = useMemo(
    () => hasActiveTopLevelBoolClauses(query) || groupFilters.length > 0,
    [query, groupFilters]
  );

  // state.query already includes any active global filter from useBaseEsQuery.
  const filteredResolutionFilter = useMemo((): ESBoolQuery | undefined => {
    if (!isResolutionGrouping || !isUserFilterActive) return undefined;
    const filterClauses: ESBoolQuery[] = [];
    if (hasActiveTopLevelBoolClauses(query)) filterClauses.push(query);
    if (groupFilters.length > 0) filterClauses.push(additionalFilters);
    if (filterClauses.length === 0) return undefined;
    if (filterClauses.length === 1) return filterClauses[0];
    return { bool: { must: [], filter: filterClauses, should: [], must_not: [] } };
  }, [isResolutionGrouping, isUserFilterActive, query, groupFilters, additionalFilters]);

  // Resolution fetch hooks are always called; enabled controls execution.
  const unfilteredResolutionResult = useFetchUnfilteredResolutionGroupData({
    pageIndex,
    pageSize,
    enabled: isResolutionGrouping && !isUserFilterActive,
  });

  const filteredResolutionResult = useFetchFilteredResolutionGroupData({
    pageIndex,
    pageSize,
    filter: filteredResolutionFilter,
    enabled: isResolutionGrouping && isUserFilterActive,
  });

  const nonResolutionGroupingQuery = useMemo((): EntitiesGroupingQuery => {
    if (isResolutionGrouping) {
      // Resolution uses dedicated ES|QL hooks instead. Return an inert query only to satisfy
      // the required `query` arg — useFetchGroupedData is disabled for this case (see enabled flag).
      return { size: 0 } as EntitiesGroupingQuery;
    }

    const allFilters = [...(query ? [query] : []), additionalFilters, ENTITY_TYPE_FILTER];

    // Entity type: use the plain mapped field directly — no Painless script needed.
    // A plain terms agg is both correct and much faster than the generic runtime-field path.
    if (selectedGroup === ENTITY_GROUPING_OPTIONS.ENTITY_TYPE) {
      const lastEntityTypePageIndex = Math.floor((ALLOWED_ENTITY_TYPES.length - 1) / pageSize);
      return {
        size: 0,
        aggs: {
          groupByFields: {
            terms: { field: ENTITY_FIELDS.ENTITY_TYPE, size: ALLOWED_ENTITY_TYPES.length },
            aggs: {
              entityType: { terms: { field: ENTITY_FIELDS.ENTITY_TYPE, size: 1 } },
              bucket_truncate: {
                bucket_sort: {
                  // Clamp stale page indexes to the last page that can contain an allowed entity type.
                  from: Math.min(pageIndex, lastEntityTypePageIndex) * pageSize,
                  size: pageSize,
                },
              },
            },
          },
          unitsCount: { value_count: { field: ENTITY_FIELDS.ENTITY_TYPE } },
          groupsCount: { cardinality: { field: ENTITY_FIELDS.ENTITY_TYPE } },
          nullGroupItems: { missing: { field: ENTITY_FIELDS.ENTITY_TYPE } },
        },
        query: {
          bool: {
            filter: allFilters,
          },
        },
        _source: false,
      } as EntitiesGroupingQuery;
    }

    const currentGroup = selectedGroup || ENTITY_GROUPING_OPTIONS.ENTITY_TYPE;
    return {
      ...getGroupingQuery({
        additionalFilters: allFilters,
        groupByField: currentGroup,
        uniqueValue,
        pageNumber: pageIndex * pageSize,
        size: pageSize,
        sort: [{ groupByField: { order: 'desc' } }],
        statsAggregations: getAggregationsByGroupField(currentGroup),
        rootAggregations: [
          {
            ...(!isNoneGroup([currentGroup]) && {
              nullGroupItems: { missing: { field: currentGroup } },
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
          // no value, or a high-cardinality multi-value field (>100) that would explode the
          // terms agg, is folded into the single "undefined"/none group instead
          treatAsUndefined = (count == 0 || count > 100);
          if (treatAsUndefined) {
            emit(params['uniqueValue']);
          } else {
            emit(groupValues.join(params['uniqueValue']));
          }
        `),
            params: {
              selectedGroup: currentGroup,
              uniqueValue,
            },
          },
        },
      },
    };
  }, [
    isResolutionGrouping,
    selectedGroup,
    uniqueValue,
    additionalFilters,
    query,
    pageIndex,
    pageSize,
  ]);

  const { data: nonResolutionData, isFetching: isNonResolutionFetching } = useFetchGroupedData({
    query: nonResolutionGroupingQuery,
    enabled: !isResolutionGrouping && !!selectedGroup && !isNoneGroup([selectedGroup]),
  });

  const activeResolutionResult = isUserFilterActive
    ? filteredResolutionResult
    : unfilteredResolutionResult;

  const isFetching = isResolutionGrouping
    ? activeResolutionResult.isFetching
    : isNonResolutionFetching;

  const targetMetadata: TargetMetadataMap = isResolutionGrouping
    ? activeResolutionResult.data?.targetMetadata ?? EMPTY_TARGET_METADATA
    : EMPTY_TARGET_METADATA;

  const groupData = useMemo((): ParsedGroupingAggregation<EntitiesGroupingAggregation> => {
    if (isResolutionGrouping) {
      const resolutionData = activeResolutionResult.data?.groupData ?? {
        groupByFields: { buckets: [] },
        groupsCount: { value: 0 },
        unitsCount: { value: 0 },
      };
      // ResolutionGroupData is structurally compatible at runtime but lacks the
      // Record<string,...> index signature that ParsedGroupingAggregation requires.
      return resolutionData as unknown as ParsedGroupingAggregation<EntitiesGroupingAggregation>;
    }
    return parseGroupingQuery(
      selectedGroup || ENTITY_GROUPING_OPTIONS.ENTITY_TYPE,
      uniqueValue,
      nonResolutionData as GroupingAggregation<EntitiesGroupingAggregation>
    ) as ParsedGroupingAggregation<EntitiesGroupingAggregation>;
  }, [
    isResolutionGrouping,
    activeResolutionResult.data,
    nonResolutionData,
    selectedGroup,
    uniqueValue,
  ]);

  const groupPanelRenderer = useMemo(
    () => createGroupPanelRenderer(targetMetadata, tableId),
    [targetMetadata, tableId]
  );

  const groupStatsRenderer = useMemo(
    () => createGroupStatsRenderer(targetMetadata),
    [targetMetadata]
  );

  const grouping = useGrouping({
    componentProps: {
      unit: entitiesUnit,
      groupPanelRenderer,
      getGroupStats: groupStatsRenderer,
      groupsUnit: entitiesGroupsUnit,
    },
    defaultGroupingOptions,
    initialGroupings,
    fields: dataViewIsLoading ? [] : dataView.fields,
    groupingId,
    maxGroupingLevels: MAX_GROUPING_LEVELS,
    title: groupingTitle,
    onGroupChange: ({ groupByFields }) => {
      setUrlQuery({
        groupBy: groupByFields,
      });
    },
  });

  useEffect(() => {
    const currentGroups = grouping.selectedGroups;
    if (!hasResolutionLicense && currentGroups.includes(ENTITY_GROUPING_OPTIONS.RESOLUTION)) {
      const filtered = currentGroups.filter((g) => g !== ENTITY_GROUPING_OPTIONS.RESOLUTION);
      const newGroups = filtered.length > 0 ? filtered : [ENTITY_GROUPING_OPTIONS.NONE];
      grouping.setSelectedGroups(newGroups);
      setUrlQuery({ groupBy: newGroups });
    }
  }, [hasResolutionLicense, grouping, setUrlQuery]);

  const isNoneSelected = isNoneGroup(grouping.selectedGroups);

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
