/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { GroupWrapper } from '@kbn/cloud-security-posture';
import { useEntityGrouping } from '../entities_table/grouping/use_entity_grouping';
import { processGroupFilters } from '../entities_table/entities_table_section';
import type { EntityURLStateResult } from '../entities_table/hooks/use_entity_url_state';
import { useEntityGridFilters } from './use_entity_grid_filters';
import { TEST_SUBJ_GROUPING, TEST_SUBJ_GROUPING_LOADING } from '../entities_table/constants';
import { EntitiesGrid } from './entities_grid';
import { CHILD_ROWS_COLUMNS } from './columns/registry';
import { RISK_SCORE_NORM_FIELD } from './common';
import type { RowsMode } from './common';
import type { TimeRange } from './use_entity_analytics_url_state';
import type { CellHandlers, RowActions } from './entities_cell_renderer';

const GROUPED_VIEW_TABLE_ID = 'ea-new-home-grouped';
const GROUPED_VIEW_GROUPING_ID = 'ea-new-home-grouped';

const TEST_SUBJECTS = {
  grouping: TEST_SUBJ_GROUPING,
  groupingLoading: TEST_SUBJ_GROUPING_LOADING,
};

export interface EntitiesGroupsProps {
  state: EntityURLStateResult;
  groupsSelected: string[];
  groupSelectorComponent: JSX.Element;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  rowsMode: RowsMode;
  /** Tile ES|QL clause (same as flat table); AND'd into leaf grids. */
  tileWhereExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
}

export const EntitiesGroups: React.FC<EntitiesGroupsProps> = ({
  state,
  groupsSelected,
  groupSelectorComponent,
  timeRange,
  watchlistNames,
  rowsMode,
  tileWhereExpression,
  cellHandlers,
  rowActions,
}) => (
  <GroupWithPagination
    state={state}
    selectedGroup={groupsSelected[0]}
    selectedGroupOptions={groupsSelected}
    groupSelectorComponent={groupSelectorComponent}
    timeRange={timeRange}
    watchlistNames={watchlistNames}
    rowsMode={rowsMode}
    tileWhereExpression={tileWhereExpression}
    cellHandlers={cellHandlers}
    rowActions={rowActions}
  />
);

// ── level 0: URL-driven pagination ───────────────────────────────────────────

interface GroupWithPaginationProps {
  state: EntityURLStateResult;
  selectedGroup: string;
  selectedGroupOptions: string[];
  groupSelectorComponent?: JSX.Element;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  rowsMode: RowsMode;
  tileWhereExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
}

const GroupWithPagination: React.FC<GroupWithPaginationProps> = ({
  state,
  selectedGroup,
  selectedGroupOptions,
  groupSelectorComponent,
  timeRange,
  watchlistNames,
  rowsMode,
  tileWhereExpression,
  cellHandlers,
  rowActions,
}) => {
  const { groupData, grouping, isFetching } = useEntityGrouping({
    state,
    selectedGroup,
    groupFilters: [],
    tableId: GROUPED_VIEW_TABLE_ID,
    groupingId: GROUPED_VIEW_GROUPING_ID,
  });

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          currentGroupFilters={currentGroupFilters}
          state={state}
          groupingLevel={1}
          selectedGroup={selectedGroup}
          selectedGroupOptions={selectedGroupOptions}
          timeRange={timeRange}
          watchlistNames={watchlistNames}
          rowsMode={rowsMode}
          tileWhereExpression={tileWhereExpression}
          cellHandlers={cellHandlers}
          rowActions={rowActions}
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
      testSubjects={TEST_SUBJECTS}
    />
  );
};

// ── routing: go deeper or render leaf ────────────────────────────────────────

interface GroupContentProps {
  currentGroupFilters: Filter[];
  state: EntityURLStateResult;
  groupingLevel: number;
  selectedGroup: string;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  rowsMode: RowsMode;
  tileWhereExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
}

const mergeFilters = (current: Filter[], parentJson: string | undefined): Filter[] => [
  ...current,
  ...(parentJson ? (JSON.parse(parentJson) as Filter[]) : []),
];

const GroupContent: React.FC<GroupContentProps> = ({
  currentGroupFilters,
  state,
  groupingLevel,
  selectedGroup,
  selectedGroupOptions,
  parentGroupFilters,
  timeRange,
  watchlistNames,
  rowsMode,
  tileWhereExpression,
  cellHandlers,
  rowActions,
}) => {
  if (groupingLevel < selectedGroupOptions.length) {
    const merged = processGroupFilters(mergeFilters(currentGroupFilters, parentGroupFilters));
    return (
      <GroupWithLocalPagination
        state={state}
        groupingLevel={groupingLevel + 1}
        selectedGroup={selectedGroupOptions[groupingLevel]}
        selectedGroupOptions={selectedGroupOptions}
        parentGroupFilters={JSON.stringify(merged)}
        timeRange={timeRange}
        watchlistNames={watchlistNames}
        rowsMode={rowsMode}
        tileWhereExpression={tileWhereExpression}
        cellHandlers={cellHandlers}
        rowActions={rowActions}
      />
    );
  }

  return (
    <LeafGrid
      currentGroupFilters={currentGroupFilters}
      parentGroupFilters={parentGroupFilters}
      timeRange={timeRange}
      watchlistNames={watchlistNames}
      rowsMode={rowsMode}
      tileWhereExpression={tileWhereExpression}
      cellHandlers={cellHandlers}
      rowActions={rowActions}
    />
  );
};

// ── level N: local pagination for nested groups ───────────────────────────────

interface GroupWithLocalPaginationProps {
  state: EntityURLStateResult;
  groupingLevel: number;
  selectedGroup: string;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  rowsMode: RowsMode;
  tileWhereExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
}

const GroupWithLocalPagination: React.FC<GroupWithLocalPaginationProps> = ({
  state,
  groupingLevel,
  selectedGroup,
  selectedGroupOptions,
  parentGroupFilters,
  timeRange,
  watchlistNames,
  rowsMode,
  tileWhereExpression,
  cellHandlers,
  rowActions,
}) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const groupFilters: Filter[] = useMemo(
    () => (parentGroupFilters ? (JSON.parse(parentGroupFilters) as Filter[]) : []),
    [parentGroupFilters]
  );

  const { groupData, grouping, isFetching } = useEntityGrouping({
    state: { ...state, pageIndex, pageSize },
    selectedGroup,
    groupFilters,
    tableId: GROUPED_VIEW_TABLE_ID,
    groupingId: GROUPED_VIEW_GROUPING_ID,
  });

  useEffect(() => {
    setPageIndex(0);
  }, [selectedGroup]);

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          currentGroupFilters={currentGroupFilters.filter((f) => f?.query)}
          state={state}
          groupingLevel={groupingLevel}
          selectedGroup={selectedGroup}
          selectedGroupOptions={selectedGroupOptions}
          parentGroupFilters={JSON.stringify(groupFilters)}
          timeRange={timeRange}
          watchlistNames={watchlistNames}
          rowsMode={rowsMode}
          tileWhereExpression={tileWhereExpression}
          cellHandlers={cellHandlers}
          rowActions={rowActions}
        />
      )}
      activePageIndex={pageIndex}
      pageSize={pageSize}
      onChangeGroupsPage={setPageIndex}
      onChangeGroupsItemsPerPage={setPageSize}
      isFetching={isFetching}
      selectedGroup={selectedGroup}
      groupingLevel={groupingLevel}
      testSubjects={TEST_SUBJECTS}
    />
  );
};

// ── leaf: ChildEntityGrid with combined filters ───────────────────────────────

interface LeafGridProps {
  currentGroupFilters: Filter[];
  parentGroupFilters?: string;
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  rowsMode: RowsMode;
  tileWhereExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
}

const LeafGrid: React.FC<LeafGridProps> = ({
  currentGroupFilters,
  parentGroupFilters,
  timeRange,
  watchlistNames,
  rowsMode,
  tileWhereExpression,
  cellHandlers,
  rowActions,
}) => {
  const [sortField, setSortField] = useState(RISK_SCORE_NORM_FIELD);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(5);

  const handleSortChange = useCallback((field: string, dir: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(dir);
    setPageIndex(0);
  }, []);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPageIndex(0);
  }, []);

  const { searchExpression: baseSearchExpression, entityExpression: baseEntityExpression } =
    useEntityGridFilters();
  const searchExpression = useMemo(() => {
    const groupFilters = processGroupFilters(mergeFilters(currentGroupFilters, parentGroupFilters));
    const { esqlExpression: groupExpr } = convertFiltersToESQLExpression(groupFilters);
    const parts = [baseSearchExpression, groupExpr].filter(Boolean);
    return parts.length ? parts.join(' AND ') : undefined;
  }, [baseSearchExpression, currentGroupFilters, parentGroupFilters]);
  const entityExpression = useMemo(() => {
    const parts = [baseEntityExpression, tileWhereExpression].filter(Boolean);
    return parts.length ? parts.join(' AND ') : undefined;
  }, [baseEntityExpression, tileWhereExpression]);

  return (
    <EntitiesGrid
      columns={CHILD_ROWS_COLUMNS}
      pageSizeOptions={[5, 10, 25]}
      searchExpression={searchExpression}
      entityExpression={entityExpression}
      timeRange={timeRange}
      watchlistNames={watchlistNames}
      rowsMode={rowsMode}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      pageIndex={pageIndex}
      pageSize={pageSize}
      onPageChange={setPageIndex}
      onPageSizeChange={handlePageSizeChange}
      cellHandlers={cellHandlers}
      rowActions={rowActions}
    />
  );
};
