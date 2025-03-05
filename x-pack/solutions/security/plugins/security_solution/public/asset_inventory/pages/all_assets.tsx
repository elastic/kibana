/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { AssetInventoryDataTable } from '../components/asset_inventory_data_table';
import { AssetInventoryGrouping } from '../components/grouping/asset_inventory_grouping';
import { useAssetInventoryGrouping } from '../components/grouping/use_asset_inventory_grouping';
import {
  groupPanelRenderer,
  groupStatsRenderer,
} from '../components/grouping/asset_inventory_group_renderer';

interface SubGroupingProps {
  renderChildComponent: (groupFilters: Filter[]) => JSX.Element;
  groupingLevel: number;
  parentGroupFilters?: string;
  selectedGroup: string;
  groupSelectorComponent?: JSX.Element;
}

const SubGrouping = ({
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
    activePageIndex,
    pageSize,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    // isGroupLoading,
    setActivePageIndex,
  } = useAssetInventoryGrouping({
    groupPanelRenderer,
    getGroupStats: groupStatsRenderer,
    groupingLevel,
    selectedGroup,
    groupFilters: parentGroupFilters ? JSON.parse(parentGroupFilters) : [],
  });

  /**
   * This is used to reset the active page index when the selected group changes
   * It is needed because the grouping number of pages can change according to the selected group
   */
  useEffect(() => {
    setActivePageIndex(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGroup]);

  return (
    <AssetInventoryGrouping
      data={groupData}
      grouping={grouping}
      renderChildComponent={renderChildComponent}
      onChangeGroupsItemsPerPage={onChangeGroupsItemsPerPage}
      onChangeGroupsPage={onChangeGroupsPage}
      activePageIndex={activePageIndex}
      isFetching={isFetching}
      pageSize={pageSize}
      selectedGroup={selectedGroup}
      // TODO isGroupLoading is not used nor expected by AssetInventoryGrouping
      // isGroupLoading={isGroupLoading}
      groupingLevel={groupingLevel}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

const renderChildComponent = ({
  level,
  currentSelectedGroup,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
}: {
  level: number;
  currentSelectedGroup: string;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
}) => {
  let getChildComponent;

  if (currentSelectedGroup === 'none') {
    return (
      <AssetInventoryDataTable
      // groupSelectorComponent={groupSelectorComponent}
      // nonPersistedFilters={[...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])]}
      // showDistributionBar={selectedGroupOptions.includes('none')}
      />
    );
  }

  if (level < selectedGroupOptions.length - 1 && !selectedGroupOptions.includes('none')) {
    getChildComponent = (currentGroupFilters: Filter[]) => {
      const nextGroupingLevel = level + 1;
      return renderChildComponent({
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
        <AssetInventoryDataTable
        // nonPersistedFilters={[
        //   ...currentGroupFilters,
        //   ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : []),
        // ]}
        // height={DEFAULT_GROUPING_TABLE_HEIGHT}
        // showDistributionBar={selectedGroupOptions.includes('none')}
        />
      );
    };
  }
  return (
    <SubGrouping
      renderChildComponent={getChildComponent}
      selectedGroup={selectedGroupOptions[level]}
      groupingLevel={level}
      parentGroupFilters={parentGroupFilters}
      groupSelectorComponent={groupSelectorComponent}
    />
  );
};

export const AllAssets = () => {
  // const { grouping, isFetching, urlQuery, setUrlQuery, onResetFilters, error, isEmptyResults } =
  //   useAssetInventoryGrouping({ groupPanelRenderer, getGroupStats: groupStatsRenderer });
  const { grouping, error, isEmptyResults } = useAssetInventoryGrouping({
    groupPanelRenderer,
    getGroupStats: groupStatsRenderer,
  });

  if (error) {
    // return (
    //   <>
    //     {error && <ErrorCallout error={error} />}
    //     {isEmptyResults && <EmptyState onResetFilters={onResetFilters} />}
    //   </>
    // );
    return <div>{error.toString()}</div>;
  }

  if (isEmptyResults) {
    return <div>{'No data'}</div>;
  }

  return (
    <div>
      {renderChildComponent({
        level: 0,
        currentSelectedGroup: grouping.selectedGroups[0],
        selectedGroupOptions: grouping.selectedGroups,
        groupSelectorComponent: grouping.groupSelector,
      })}
    </div>
  );
};
