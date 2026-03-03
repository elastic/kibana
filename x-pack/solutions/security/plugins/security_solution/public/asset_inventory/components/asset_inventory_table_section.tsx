/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import type { GroupOption } from '@kbn/grouping';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridControlColumn } from '@elastic/eui';
import type { AssetInventoryURLStateResult } from '../hooks/use_asset_inventory_url_state/use_asset_inventory_url_state';
import { ASSET_FIELDS, DEFAULT_TABLE_SECTION_HEIGHT } from '../constants';
import { GroupWrapper } from './grouping/asset_inventory_grouping';
import { useAssetInventoryGrouping, type GroupingLabelOverrides } from './grouping/use_asset_inventory_grouping';
import { AssetInventoryDataTable, type AssetInventoryDataTableProps } from './asset_inventory_data_table';

export interface DataTableCustomizationProps {
  onDocumentOpen?: (doc: DataTableRecord) => void;
  onDocumentClose?: () => void;
  getLeadingControlColumns?: (rows: DataTableRecord[]) => EuiDataGridControlColumn[];
  rowTypeLabel?: string;
  columnHeaderOverrides?: Record<string, string>;
  inspectQueryId?: string;
  inspectTitle?: string;
  setQuery?: AssetInventoryDataTableProps['setQuery'];
  deleteQuery?: AssetInventoryDataTableProps['deleteQuery'];
  showLastUpdated?: boolean;
  defaultColumns?: AssetInventoryDataTableProps['defaultColumns'];
  additionalCustomRenderers?: AssetInventoryDataTableProps['additionalCustomRenderers'];
}

export interface AssetInventoryTableSectionProps extends DataTableCustomizationProps {
  state: AssetInventoryURLStateResult;
  groupingOptions?: GroupOption[];
  groupingId?: string;
  groupingLabelOverrides?: GroupingLabelOverrides;
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
export const AssetInventoryTableSection = ({
  state,
  groupingOptions,
  groupingId,
  groupingLabelOverrides,
  ...dataTableProps
}: AssetInventoryTableSectionProps) => {
  const groupingDisabled =
    groupingOptions !== undefined && groupingOptions.length === 0;

  const { grouping } = useAssetInventoryGrouping({
    state,
    groupingOptions,
    groupingId,
    groupingLabelOverrides,
  });
  const selectedGroup = grouping.selectedGroups[0];

  if (groupingDisabled || selectedGroup === 'none') {
    return (
      <AssetInventoryDataTable
        state={state}
        groupSelectorComponent={groupingDisabled ? undefined : grouping.groupSelector}
        {...dataTableProps}
      />
    );
  }

  return (
    <GroupWithURLPagination
      state={state}
      selectedGroup={selectedGroup}
      selectedGroupOptions={grouping.selectedGroups}
      groupSelectorComponent={grouping.groupSelector}
      groupingLabelOverrides={groupingLabelOverrides}
      dataTableProps={dataTableProps}
    />
  );
};

interface GroupWithURLPaginationProps {
  state: AssetInventoryURLStateResult;
  selectedGroup: string;
  selectedGroupOptions: string[];
  groupSelectorComponent?: JSX.Element;
  groupingLabelOverrides?: GroupingLabelOverrides;
  dataTableProps?: DataTableCustomizationProps;
}

const GroupWithURLPagination = ({
  state,
  selectedGroup,
  selectedGroupOptions,
  groupSelectorComponent,
  groupingLabelOverrides,
  dataTableProps,
}: GroupWithURLPaginationProps) => {
  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state,
    selectedGroup,
    groupFilters: [],
    groupingLabelOverrides,
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
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          currentGroupFilters={currentGroupFilters}
          state={state}
          groupingLevel={1}
          selectedGroupOptions={selectedGroupOptions}
          groupSelectorComponent={groupSelectorComponent}
          groupingLabelOverrides={groupingLabelOverrides}
          dataTableProps={dataTableProps}
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
  groupingLabelOverrides?: GroupingLabelOverrides;
  dataTableProps?: DataTableCustomizationProps;
}

/**
 * This function is used to modify the filters for the asset inventory grouping
 * It is needed because the asset.criticality field has a soft delete mechanism
 * So asset.criticality = "deleted" should be excluded from the grouping
 * (treated as a missing value)
 */
const groupFilterMap = (filter: Filter | null): Filter | null => {
  const query = filter?.query;
  if (query?.bool?.should?.[0]?.bool?.must_not?.exists?.field === ASSET_FIELDS.ASSET_CRITICALITY) {
    return {
      meta: filter?.meta ?? { alias: null, disabled: false, negate: false },
      query: {
        bool: {
          filter: {
            bool: {
              should: [
                { term: { [ASSET_FIELDS.ASSET_CRITICALITY]: 'deleted' } },
                { bool: { must_not: { exists: { field: ASSET_FIELDS.ASSET_CRITICALITY } } } },
              ],
              minimum_should_match: 1,
            },
          },
        },
      },
    };
  }
  return query?.match_phrase || query?.bool?.should || query?.bool?.filter ? filter : null;
};

const filterTypeGuard = (filter: Filter | null): filter is Filter => filter !== null;

const mergeCurrentAndParentFilters = (
  currentGroupFilters: Filter[],
  parentGroupFilters: string | undefined
) => {
  return [...currentGroupFilters, ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])];
};

const GroupContent = ({
  currentGroupFilters,
  state,
  groupingLevel,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
  groupingLabelOverrides,
  dataTableProps,
}: GroupContentProps) => {
  if (groupingLevel < selectedGroupOptions.length) {
    const nextGroupingLevel = groupingLevel + 1;

    const newParentGroupFilters = mergeCurrentAndParentFilters(
      currentGroupFilters,
      parentGroupFilters
    )
      .map(groupFilterMap)
      .filter(filterTypeGuard);

    return (
      <GroupWithLocalPagination
        state={state}
        groupingLevel={nextGroupingLevel}
        selectedGroup={selectedGroupOptions[groupingLevel]}
        selectedGroupOptions={selectedGroupOptions}
        parentGroupFilters={JSON.stringify(newParentGroupFilters)}
        groupSelectorComponent={groupSelectorComponent}
        groupingLabelOverrides={groupingLabelOverrides}
        dataTableProps={dataTableProps}
      />
    );
  }

  return (
    <DataTableWithLocalPagination
      state={state}
      currentGroupFilters={currentGroupFilters}
      parentGroupFilters={parentGroupFilters}
      dataTableProps={dataTableProps}
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
  groupingLabelOverrides,
  dataTableProps,
}: GroupWithLocalPaginationProps) => {
  const [subgroupPageIndex, setSubgroupPageIndex] = useState(0);
  const [subgroupPageSize, setSubgroupPageSize] = useState(10);

  const groupFilters = parentGroupFilters ? JSON.parse(parentGroupFilters) : [];

  const { groupData, grouping, isFetching } = useAssetInventoryGrouping({
    state: { ...state, pageIndex: subgroupPageIndex, pageSize: subgroupPageSize },
    selectedGroup,
    groupFilters,
    groupingLabelOverrides,
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
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          currentGroupFilters={currentGroupFilters.map(groupFilterMap).filter(filterTypeGuard)}
          state={state}
          groupingLevel={groupingLevel}
          selectedGroupOptions={selectedGroupOptions}
          groupSelectorComponent={groupSelectorComponent}
          parentGroupFilters={JSON.stringify(groupFilters)}
          groupingLabelOverrides={groupingLabelOverrides}
          dataTableProps={dataTableProps}
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

interface DataTableWithLocalPaginationProps {
  state: AssetInventoryURLStateResult;
  currentGroupFilters: Filter[];
  parentGroupFilters?: string;
  dataTableProps?: DataTableCustomizationProps;
}

const getDataGridFilter = (filter: Filter | null) => {
  if (!filter) return null;
  return {
    ...(filter?.query ?? {}),
  };
};

const DataTableWithLocalPagination = ({
  state,
  currentGroupFilters,
  parentGroupFilters,
  dataTableProps,
}: DataTableWithLocalPaginationProps) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const combinedFilters = mergeCurrentAndParentFilters(currentGroupFilters, parentGroupFilters)
    .map(groupFilterMap)
    .filter(filterTypeGuard)
    .map(getDataGridFilter)
    .filter((filter): filter is NonNullable<Filter['query']> => Boolean(filter));

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

  return (
    <AssetInventoryDataTable
      state={newState}
      height={DEFAULT_TABLE_SECTION_HEIGHT}
      {...dataTableProps}
    />
  );
};
