/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect } from 'react';
import type { Filter } from '@kbn/es-query';
import { GroupWrapper } from '@kbn/cloud-security-posture';
import type { EntityURLStateResult } from './hooks/use_entity_url_state';
import {
  DEFAULT_TABLE_SECTION_HEIGHT,
  TEST_SUBJ_GROUPING,
  TEST_SUBJ_GROUPING_LOADING,
} from './constants';
import { useEntityGrouping } from './grouping/use_entity_grouping';

const ENTITY_ANALYTICS_TEST_SUBJECTS = {
  grouping: TEST_SUBJ_GROUPING,
  groupingLoading: TEST_SUBJ_GROUPING_LOADING,
};
import { EntitiesDataTable } from './entities_data_table';

export interface EntitiesTableSectionProps {
  state: EntityURLStateResult;
}

export const EntitiesTableSection = ({ state }: EntitiesTableSectionProps) => {
  const { grouping } = useEntityGrouping({ state });
  const selectedGroup = grouping.selectedGroups[0];

  if (selectedGroup === 'none') {
    return <EntitiesDataTable state={state} groupSelectorComponent={grouping.groupSelector} />;
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
  state: EntityURLStateResult;
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
  const { groupData, grouping, isFetching } = useEntityGrouping({
    state,
    selectedGroup,
    groupFilters: [],
  });

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
      testSubjects={ENTITY_ANALYTICS_TEST_SUBJECTS}
    />
  );
};

interface GroupContentProps {
  currentGroupFilters: Filter[];
  state: EntityURLStateResult;
  groupingLevel: number;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
}

const filterTypeGuard = (filter: Filter | null): filter is Filter => filter !== null;

const mergeCurrentAndParentFilters = (
  currentGroupFilters: Filter[],
  parentGroupFilters: string | undefined
) => {
  return [...currentGroupFilters, ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])];
};

const groupFilterMap = (filter: Filter | null): Filter | null => {
  const query = filter?.query;
  return query?.match_phrase || query?.bool?.should || query?.bool?.filter ? filter : null;
};

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

  const groupFilters = parentGroupFilters ? JSON.parse(parentGroupFilters) : [];

  const { groupData, grouping, isFetching } = useEntityGrouping({
    state: { ...state, pageIndex: subgroupPageIndex, pageSize: subgroupPageSize },
    selectedGroup,
    groupFilters,
  });

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
      testSubjects={ENTITY_ANALYTICS_TEST_SUBJECTS}
    />
  );
};

interface DataTableWithLocalPaginationProps {
  state: EntityURLStateResult;
  currentGroupFilters: Filter[];
  parentGroupFilters?: string;
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
}: DataTableWithLocalPaginationProps) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const combinedFilters = mergeCurrentAndParentFilters(currentGroupFilters, parentGroupFilters)
    .map(groupFilterMap)
    .filter(filterTypeGuard)
    .map(getDataGridFilter)
    .filter((filter): filter is NonNullable<Filter['query']> => Boolean(filter));

  const newState: EntityURLStateResult = {
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

  return <EntitiesDataTable state={newState} height={DEFAULT_TABLE_SECTION_HEIGHT} />;
};
