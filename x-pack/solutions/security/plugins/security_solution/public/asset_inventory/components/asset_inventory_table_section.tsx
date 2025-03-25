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
import { AssetInventoryGrouping } from './grouping/asset_inventory_grouping';
import { useAssetInventoryGrouping } from './grouping/use_asset_inventory_grouping';
import { AssetInventoryDataTable } from './asset_inventory_data_table';

interface TopLevelGroupProps {
  state: AssetInventoryURLStateResult;
  renderChildComponent: (groupFilters: Filter[]) => JSX.Element;
  selectedGroup: string;
  groupSelectorComponent?: JSX.Element;
}

interface SubGroupProps extends TopLevelGroupProps {
  groupingLevel: number;
  parentGroupFilters?: string;
}

const TopLevelGroup = ({
  state,
  renderChildComponent,
  selectedGroup,
  groupSelectorComponent,
}: TopLevelGroupProps) => {
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
    <AssetInventoryGrouping
      data={groupData}
      grouping={grouping}
      renderChildComponent={renderChildComponent}
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

const SubGroup = ({
  state,
  renderChildComponent,
  groupingLevel,
  parentGroupFilters,
  selectedGroup,
  groupSelectorComponent,
}: SubGroupProps) => {
  const [subgroupPageIndex, setSubgroupPageIndex] = useState(0);
  const [subgroupPageSize, setSubgroupPageSize] = useState(10);

  const subgroupState = { ...state, pageIndex: subgroupPageIndex, pageSize: subgroupPageSize };

  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state: subgroupState,
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
    <AssetInventoryGrouping
      data={groupData}
      grouping={grouping}
      renderChildComponent={renderChildComponent}
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
  // Reusable parts
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  /**
   * This is used to reset the active page index when the selected group changes
   * It is needed because the grouping number of pages can change according to the selected group
   */
  useEffect(() => {
    setTablePageIndex(0);
  }, [tablePageSize]);

  // End of Reusable parts

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

const renderChildComponent = ({
  state,
  level,
  currentSelectedGroup,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
}: {
  state: AssetInventoryURLStateResult;
  level: number;
  currentSelectedGroup: string;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
}) => {
  let getChildComponent: (groupFilters: Filter[]) => JSX.Element;

  if (currentSelectedGroup === 'none') {
    return (
      <AssetInventoryDataTable state={state} groupSelectorComponent={groupSelectorComponent} />
    );
  }

  if (level < selectedGroupOptions.length - 1 && !selectedGroupOptions.includes('none')) {
    getChildComponent = (currentGroupFilters: Filter[]) => {
      const nextGroupingLevel = level + 1;
      return renderChildComponent({
        state,
        level: nextGroupingLevel,
        currentSelectedGroup: selectedGroupOptions[nextGroupingLevel],
        selectedGroupOptions,
        parentGroupFilters: JSON.stringify([
          ...currentGroupFilters,
          ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
        ]),
        groupSelectorComponent,
      });
    };
  } else {
    getChildComponent = (currentGroupFilters: Filter[]) => {
      return (
        <DataTableWithLocalPagination
          state={state}
          currentGroupFilters={currentGroupFilters}
          parentGroupFilters={parentGroupFilters}
        />
      );
    };
  }

  if (level === 0) {
    return (
      <TopLevelGroup
        state={state}
        renderChildComponent={getChildComponent}
        selectedGroup={selectedGroupOptions[level]}
        groupSelectorComponent={groupSelectorComponent}
      />
    );
  }

  return (
    <SubGroup
      state={state}
      renderChildComponent={getChildComponent}
      selectedGroup={selectedGroupOptions[level]}
      groupingLevel={level}
      parentGroupFilters={parentGroupFilters}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

export interface AssetInventoryTableSectionProps {
  state: AssetInventoryURLStateResult;
}

export const AssetInventoryTableSection = ({ state }: AssetInventoryTableSectionProps) => {
  const { grouping } = useAssetInventoryGrouping({ state });

  return (
    <div>
      {renderChildComponent({
        state,
        level: 0,
        currentSelectedGroup: grouping.selectedGroups[0],
        selectedGroupOptions: grouping.selectedGroups,
        groupSelectorComponent: grouping.groupSelector,
      })}
    </div>
  );
};
