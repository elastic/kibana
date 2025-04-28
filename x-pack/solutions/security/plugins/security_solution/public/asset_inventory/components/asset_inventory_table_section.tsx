/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import type { AssetInventoryURLStateResult } from '../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { DEFAULT_TABLE_SECTION_HEIGHT } from '../constants';
import { GroupWrapper } from './grouping/asset_inventory_grouping';
import { useAssetInventoryGrouping } from './grouping/use_asset_inventory_grouping';
import { AssetInventoryDataTable } from './asset_inventory_data_table';

export interface AssetInventoryTableSectionProps {
  state: AssetInventoryURLStateResult;
}

/**
 * Recursive component hierarchy
 *
 * AssetInventoryTableSection (renders either/or one of the children)
 * |-- AssetInventoryDataTable (no grouping)
 * |-- GroupWithURLPagination (grouping level = 0, renders both children)
 *     |-- GroupWrapper
 *     |-- GroupContent
 *         |-- GroupWithLocalPagination (grouping level = 1, renders both children)
 *             |-- GroupWrapper
 *             |-- GroupContent (renders)
 *                 |-- DataTableWithLocalPagination
 *                     |-- AssetInventoryDataTable (grouping level = 2)
 */
export const AssetInventoryTableSection = ({ state }: AssetInventoryTableSectionProps) => {
  const { grouping } = useAssetInventoryGrouping({ state });
  const selectedGroup = grouping.selectedGroups[0];

  if (selectedGroup === 'none') {
    return (
      <AssetInventoryDataTable state={state} groupSelectorComponent={grouping.groupSelector} />
    );
  }

  return (
    <GroupWithURLPagination
      state={state}
      selectedGroup={selectedGroup}
      selectedGroupOptions={grouping.selectedGroups}
      groupSelectorComponent={grouping.groupSelector}
    />
  );
};

interface GroupWithURLPaginationProps {
  state: AssetInventoryURLStateResult;
  selectedGroup: string;
  selectedGroupOptions: string[];
  groupSelectorComponent?: JSX.Element;
}

const GroupWithURLPagination = ({
  state,
  selectedGroup,
  selectedGroupOptions,
  groupSelectorComponent,
}: GroupWithURLPaginationProps) => {
  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state,
    selectedGroup,
    groupFilters: [],
  });

  /**
   * This is used to reset the active page index when the selected group changes
   * It is needed because the grouping number of pages can change according to the selected group
   */
  useEffect(() => {
    state.onChangePage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(childFilters) => (
        <GroupContent
          currentGroupFilters={childFilters}
          state={state}
          groupingLevel={1}
          selectedGroupOptions={selectedGroupOptions}
          groupSelectorComponent={groupSelectorComponent}
        />
      )}
      activePageIndex={state.pageIndex}
      pageSize={state.pageSize}
      onChangeGroupsPage={state.onChangePage}
      onChangeGroupsItemsPerPage={state.onChangeItemsPerPage}
      isFetching={isFetching}
      selectedGroup={selectedGroup}
      groupingLevel={0}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

interface GroupContentProps {
  currentGroupFilters: Filter[];
  state: AssetInventoryURLStateResult;
  groupingLevel: number;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
}

const GroupContent = ({
  currentGroupFilters,
  state,
  groupingLevel,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
}: GroupContentProps) => {
  if (groupingLevel < selectedGroupOptions.length) {
    const nextGroupingLevel = groupingLevel + 1;
    return (
      <GroupWithLocalPagination
        state={state}
        groupingLevel={nextGroupingLevel}
        selectedGroup={selectedGroupOptions[groupingLevel]}
        selectedGroupOptions={selectedGroupOptions}
        parentGroupFilters={JSON.stringify([
          ...currentGroupFilters,
          ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
        ])}
        groupSelectorComponent={groupSelectorComponent}
      />
    );
  }

  return (
    <DataTableWithLocalPagination
      state={state}
      currentGroupFilters={currentGroupFilters}
      parentGroupFilters={parentGroupFilters}
    />
  );
};

interface GroupWithLocalPaginationProps extends GroupWithURLPaginationProps {
  groupingLevel: number;
  parentGroupFilters?: string;
}

const GroupWithLocalPagination = ({
  state,
  groupingLevel,
  parentGroupFilters,
  selectedGroup,
  selectedGroupOptions,
  groupSelectorComponent,
}: GroupWithLocalPaginationProps) => {
  const [subgroupPageIndex, setSubgroupPageIndex] = useState(0);
  const [subgroupPageSize, setSubgroupPageSize] = useState(10);

  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state: { ...state, pageIndex: subgroupPageIndex, pageSize: subgroupPageSize },
    selectedGroup,
    groupFilters: parentGroupFilters ? JSON.parse(parentGroupFilters) : [],
  });

  /**
   * This is used to reset the active page index when the selected group changes
   * It is needed because the grouping number of pages can change according to the selected group
   */
  useEffect(() => {
    setSubgroupPageIndex(0);
  }, [selectedGroup]);

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(childFilters) => (
        <GroupContent
          currentGroupFilters={childFilters}
          state={state}
          groupingLevel={groupingLevel}
          selectedGroupOptions={selectedGroupOptions}
          groupSelectorComponent={groupSelectorComponent}
        />
      )}
      activePageIndex={subgroupPageIndex}
      pageSize={subgroupPageSize}
      onChangeGroupsPage={setSubgroupPageIndex}
      onChangeGroupsItemsPerPage={setSubgroupPageSize}
      isFetching={isFetching}
      selectedGroup={selectedGroup}
      groupingLevel={groupingLevel}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

interface DataTableWithLocalPagination {
  state: AssetInventoryURLStateResult;
  currentGroupFilters: Filter[];
  parentGroupFilters?: string;
}

const DataTableWithLocalPagination = ({
  state,
  currentGroupFilters,
  parentGroupFilters,
}: DataTableWithLocalPagination) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const combinedFilters = [
    ...currentGroupFilters,
    ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
  ]
    .map(({ query }) => (query.match_phrase ? query : null))
    .filter(Boolean);

  const newState: AssetInventoryURLStateResult = {
    ...state,
    query: {
      ...state.query,
      bool: {
        ...state.query.bool,
        filter: [...state.query.bool.filter, ...combinedFilters],
      },
    },
    pageIndex: tablePageIndex,
    pageSize: tablePageSize,
    onChangePage: setTablePageIndex,
    onChangeItemsPerPage: setTablePageSize,
  };

  return <AssetInventoryDataTable state={newState} height={DEFAULT_TABLE_SECTION_HEIGHT} />;
};
