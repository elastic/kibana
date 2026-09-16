/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useMemo } from 'react';
import { useGrouping, type GroupOption } from '@kbn/grouping';
import { type ParsedGroupingAggregation } from '@kbn/grouping/src';
import { GroupWrapper } from '@kbn/cloud-security-posture';
import {
  createGroupPanelRenderer,
  createGroupStatsRenderer,
} from '../entities_table/grouping/entity_group_renderer';
import type {
  EntitiesGroupingAggregation,
  TargetMetadataMap,
} from '../entities_table/grouping/use_fetch_grouped_data';
import {
  useFetchUnfilteredResolutionGroupData,
  useFetchFilteredResolutionGroupData,
} from '../entities_table/grouping/use_fetch_grouped_data';
import { DataViewContext } from '../entities_table';
import { ENTITY_GROUPING_OPTIONS } from '../entities_table/constants';
import { ChildEntityGrid } from './child_entity_grid';
import { buildResolutionFilter, getResolutionTargetId } from './resolution_helpers';
import { RESOLUTION_GROUPING_ID } from './constants';
import type { TimeRange } from './constants';

interface ResolvedViewProps {
  groupingPageIndex: number;
  groupingPageSize: number;
  onChangeGroupsPage: (idx: number) => void;
  onChangeGroupsItemsPerPage: (size: number) => void;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  esFilter: object | undefined;
  groupSelectorComponent: JSX.Element;
}

export const ResolvedView: React.FC<ResolvedViewProps> = ({
  groupingPageIndex,
  groupingPageSize,
  onChangeGroupsPage,
  onChangeGroupsItemsPerPage,
  timeRange,
  watchlistNames,
  esFilter,
  groupSelectorComponent,
}) => {
  const { dataView, dataViewIsLoading } = useContext(DataViewContext);
  const isUserFilterActive = esFilter != null;

  const unfilteredResolution = useFetchUnfilteredResolutionGroupData({
    pageIndex: groupingPageIndex,
    pageSize: groupingPageSize,
    enabled: !isUserFilterActive,
  });

  const filteredResolution = useFetchFilteredResolutionGroupData({
    pageIndex: groupingPageIndex,
    pageSize: groupingPageSize,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter: esFilter as any,
    enabled: isUserFilterActive,
  });

  const activeResolution = isUserFilterActive ? filteredResolution : unfilteredResolution;

  const resolvedTargetMetadata: TargetMetadataMap = useMemo(
    () => activeResolution.data?.targetMetadata ?? new Map(),
    [activeResolution.data?.targetMetadata]
  );

  const resolvedGroupData = (activeResolution.data?.groupData ?? {
    groupByFields: { buckets: [] },
    groupsCount: { value: 0 },
    unitsCount: { value: 0 },
  }) as unknown as ParsedGroupingAggregation<EntitiesGroupingAggregation>;

  const resolvedGroupOptions = useMemo<GroupOption[]>(
    () => [{ label: 'Resolution', key: ENTITY_GROUPING_OPTIONS.RESOLUTION }],
    []
  );

  const groupPanelRenderer = useMemo(
    () => createGroupPanelRenderer(resolvedTargetMetadata, 'ea-new-home'),
    [resolvedTargetMetadata]
  );

  const groupStatsRenderer = useMemo(
    () => createGroupStatsRenderer(resolvedTargetMetadata),
    [resolvedTargetMetadata]
  );

  const resolvedGrouping = useGrouping<EntitiesGroupingAggregation>({
    componentProps: {
      unit: (count: number) => (count === 1 ? 'entity' : 'entities'),
      groupPanelRenderer,
      getGroupStats: groupStatsRenderer,
      groupsUnit: (count: number) =>
        `${count.toLocaleString()} ${count === 1 ? 'group' : 'groups'}`,
    },
    defaultGroupingOptions: resolvedGroupOptions,
    initialGroupings: {
      groupById: {
        [RESOLUTION_GROUPING_ID]: {
          activeGroups: [ENTITY_GROUPING_OPTIONS.RESOLUTION],
          options: resolvedGroupOptions,
        },
      },
    },
    fields: dataViewIsLoading ? [] : dataView.fields,
    groupingId: RESOLUTION_GROUPING_ID,
    maxGroupingLevels: 1,
    title: 'View by',
    onGroupChange: () => {},
  });

  return (
    <GroupWrapper
      data={resolvedGroupData}
      grouping={resolvedGrouping}
      renderChildComponent={(filters) => {
        const targetId = getResolutionTargetId(filters);
        const childFilter = targetId ? buildResolutionFilter(targetId) : undefined;
        return (
          <ChildEntityGrid
            filter={childFilter}
            timeRange={timeRange}
            watchlistNames={watchlistNames}
          />
        );
      }}
      activePageIndex={groupingPageIndex}
      pageSize={groupingPageSize}
      onChangeGroupsPage={onChangeGroupsPage}
      onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
      isFetching={activeResolution.isFetching}
      selectedGroup={ENTITY_GROUPING_OPTIONS.RESOLUTION}
      groupingLevel={0}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};
