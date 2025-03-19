/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { AssetInventoryDataTable } from './asset_inventory_data_table';
import { AssetInventoryGrouping } from './grouping/asset_inventory_grouping';
import { useAssetInventoryGrouping } from './grouping/use_asset_inventory_grouping';
import { groupPanelRenderer, groupStatsRenderer } from './grouping/asset_inventory_group_renderer';
import type { AssetInventoryDataTableResult } from '../hooks/use_asset_inventory_data_table';

// TODO Move to constants?
const DEFAULT_GROUPING_TABLE_HEIGHT = 512; // px

interface SubGroupingProps {
  state: AssetInventoryDataTableResult;
  renderChildComponent: (groupFilters: Filter[]) => JSX.Element;
  groupingLevel: number;
  parentGroupFilters?: string;
  selectedGroup: string;
  groupSelectorComponent?: JSX.Element;
}

const SubGrouping = ({
  state,
  renderChildComponent,
  groupingLevel,
  parentGroupFilters,
  selectedGroup,
  groupSelectorComponent,
}: SubGroupingProps) => {
  const {
    groupData,
    grouping,
    isFetching,
    // activePageIndex,
    // pageSize,
    // onChangeGroupsItemsPerPage,
    // onChangeGroupsPage,
    // isGroupLoading,
    // setActivePageIndex,
  } = useAssetInventoryGrouping({
    state,
    groupPanelRenderer,
    getGroupStats: groupStatsRenderer,
    // groupingLevel,
    selectedGroup,
    groupFilters: parentGroupFilters ? JSON.parse(parentGroupFilters) : [],
  });

  /**
   * This is used to reset the active page index when the selected group changes
   * It is needed because the grouping number of pages can change according to the selected group
   */
  useEffect(() => {
    state.onChangePage(0); // setActivePageIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  return (
    <AssetInventoryGrouping
      data={groupData}
      grouping={grouping}
      renderChildComponent={renderChildComponent}
      // onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
      onChangeGroupsItemsPerPage={state.onChangeItemsPerPage}
      // onChangeGroupsPage={onChangeGroupsPage}
      onChangeGroupsPage={state.onChangePage}
      // activePageIndex={activePageIndex}
      activePageIndex={state.pageIndex}
      isFetching={isFetching}
      // pageSize={pageSize}
      pageSize={state.pageSize}
      selectedGroup={selectedGroup}
      // TODO isGroupLoading is not used nor expected by AssetInventoryGrouping
      // isGroupLoading={isGroupLoading}
      groupingLevel={groupingLevel}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

const renderChildComponent = ({
  state,
  level,
  currentSelectedGroup,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
}: {
  state: AssetInventoryDataTableResult;
  level: number;
  currentSelectedGroup: string;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
}) => {
  let getChildComponent;

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
      const combinedFilters = [
        ...currentGroupFilters,
        ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
      ]
        .map(({ query }) => (query.match_phrase ? query : null))
        .filter(Boolean);

      const newState = {
        ...state,
        query: {
          ...state.query,
          bool: {
            ...state.query.bool,
            filter: [...state.query.bool.filter, ...combinedFilters],
          },
        },
      };

      return <AssetInventoryDataTable state={newState} height={DEFAULT_GROUPING_TABLE_HEIGHT} />;
    };
  }
  return (
    <SubGrouping
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
  state: AssetInventoryDataTableResult;
}

export const AssetInventoryTableSection = ({ state }: AssetInventoryTableSectionProps) => {
  const { grouping } = useAssetInventoryGrouping({
    state,
    groupPanelRenderer,
    getGroupStats: groupStatsRenderer,
  });

  // if (isEmptyResults) {

  // }

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
