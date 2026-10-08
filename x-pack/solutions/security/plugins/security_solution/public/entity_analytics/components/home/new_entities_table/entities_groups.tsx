/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { convertFiltersToESQLExpression } from '@kbn/esql-utils';
import { GroupWrapper } from '@kbn/cloud-security-posture';
import { useEntityGrouping } from '../entities_table/grouping/use_entity_grouping';
import { processGroupFilters } from '../entities_table/entities_table_section';
import type { EntityURLStateResult } from '../entities_table/hooks/use_entity_url_state';
import { TEST_SUBJ_GROUPING, TEST_SUBJ_GROUPING_LOADING } from '../entities_table/constants';
import { EntitiesGrid } from './entities_grid';
import { CHILD_ROWS_COLUMNS } from './grid_columns';
import { RISK_SCORE_NORM_FIELD } from './common';
import { joinAnd } from './queries/esql';
import type { RowsMode, SortDir } from './common';
import type { TimeRange } from './hooks/use_entity_analytics_url_state';
import type { CellHandlers, RowActions } from './entities_cell_renderer';

const GROUPED_VIEW_TABLE_ID = 'ea-new-home-grouped';
const GROUPED_VIEW_GROUPING_ID = 'ea-new-home-grouped';

const TEST_SUBJECTS = {
  grouping: TEST_SUBJ_GROUPING,
  groupingLoading: TEST_SUBJ_GROUPING_LOADING,
};

/** What every level passes down to the grids at the bottom. */
interface GroupViewProps {
  timeRange: TimeRange;
  watchlistNames: Map<string, string>;
  rowsMode: RowsMode;
  /** The page's active filters, as the flat grid gets them; leaf grids add their group. */
  searchExpression?: string;
  entityExpression?: string;
  cellHandlers?: CellHandlers;
  rowActions?: RowActions;
}

/** A level of groups: the grouping state and the group field of each level. */
interface GroupLevelProps extends GroupViewProps {
  state: EntityURLStateResult;
  selectedGroup: string;
  selectedGroupOptions: string[];
}

/**
 * The filters of the enclosing groups. A JSON string, not an array: the group wrapper hands
 * each level new filter arrays on every render, and a string compares by value, so the
 * grouping memos below don't recompute on every render.
 */
type ParentGroupFilters = string | undefined;

export interface EntitiesGroupsProps extends GroupViewProps {
  state: EntityURLStateResult;
  groupsSelected: string[];
  groupSelectorComponent: JSX.Element;
}

export const EntitiesGroups: React.FC<EntitiesGroupsProps> = ({ groupsSelected, ...props }) => (
  <GroupWithPagination
    {...props}
    selectedGroup={groupsSelected[0]}
    selectedGroupOptions={groupsSelected}
  />
);

// ── level 0: URL-driven pagination ───────────────────────────────────────────

interface GroupWithPaginationProps extends GroupLevelProps {
  groupSelectorComponent?: JSX.Element;
}

const GroupWithPagination: React.FC<GroupWithPaginationProps> = ({
  groupSelectorComponent,
  ...level
}) => {
  const { state, selectedGroup } = level;
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
        <GroupContent {...level} currentGroupFilters={currentGroupFilters} groupingLevel={1} />
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

interface GroupContentProps extends GroupLevelProps {
  currentGroupFilters: Filter[];
  groupingLevel: number;
  parentGroupFilters?: ParentGroupFilters;
}

const getMergedFilters = (current: Filter[], parentJson: ParentGroupFilters): Filter[] => [
  ...current,
  ...(parentJson ? (JSON.parse(parentJson) as Filter[]) : []),
];

const GroupContent: React.FC<GroupContentProps> = ({
  currentGroupFilters,
  groupingLevel,
  parentGroupFilters,
  ...level
}) => {
  const { selectedGroupOptions } = level;
  if (groupingLevel < selectedGroupOptions.length) {
    const merged = processGroupFilters(getMergedFilters(currentGroupFilters, parentGroupFilters));
    return (
      <GroupWithLocalPagination
        {...level}
        // A new group resets this level's local pagination.
        key={selectedGroupOptions[groupingLevel]}
        groupingLevel={groupingLevel + 1}
        selectedGroup={selectedGroupOptions[groupingLevel]}
        parentGroupFilters={JSON.stringify(merged)}
      />
    );
  }

  return (
    <LeafGrid
      {...level}
      currentGroupFilters={currentGroupFilters}
      parentGroupFilters={parentGroupFilters}
    />
  );
};

// ── level N: local pagination for nested groups ───────────────────────────────

interface GroupWithLocalPaginationProps extends GroupLevelProps {
  groupingLevel: number;
  parentGroupFilters?: ParentGroupFilters;
}

const GroupWithLocalPagination: React.FC<GroupWithLocalPaginationProps> = ({
  groupingLevel,
  parentGroupFilters,
  ...level
}) => {
  const { state, selectedGroup } = level;
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

  return (
    <GroupWrapper
      data={groupData}
      grouping={grouping}
      renderChildComponent={(currentGroupFilters) => (
        <GroupContent
          {...level}
          currentGroupFilters={currentGroupFilters.filter((f) => f?.query)}
          groupingLevel={groupingLevel}
          parentGroupFilters={parentGroupFilters}
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

// ── leaf: an entities grid with the search and the group's filters ───────────

interface LeafGridProps extends GroupViewProps {
  currentGroupFilters: Filter[];
  parentGroupFilters?: ParentGroupFilters;
}

const LeafGrid: React.FC<LeafGridProps> = ({
  currentGroupFilters,
  parentGroupFilters,
  timeRange,
  watchlistNames,
  rowsMode,
  searchExpression,
  entityExpression,
  cellHandlers,
  rowActions,
}) => {
  const [sortField, setSortField] = useState(RISK_SCORE_NORM_FIELD);
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');

  const handleSortChange = useCallback((field: string, dir: SortDir) => {
    setSortField(field);
    setSortDirection(dir);
  }, []);

  const leafSearchExpression = useMemo(() => {
    const groupFilters = processGroupFilters(
      getMergedFilters(currentGroupFilters, parentGroupFilters)
    );
    const { esqlExpression: groupExpr } = convertFiltersToESQLExpression(groupFilters);
    return joinAnd(searchExpression, groupExpr);
  }, [searchExpression, currentGroupFilters, parentGroupFilters]);

  return (
    <EntitiesGrid
      columns={CHILD_ROWS_COLUMNS}
      searchExpression={leafSearchExpression}
      entityExpression={entityExpression}
      timeRange={timeRange}
      watchlistNames={watchlistNames}
      rowsMode={rowsMode}
      sortField={sortField}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      cellHandlers={cellHandlers}
      rowActions={rowActions}
    />
  );
};
