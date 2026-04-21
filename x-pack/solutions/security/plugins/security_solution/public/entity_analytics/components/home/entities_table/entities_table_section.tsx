/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { GroupWrapper } from '@kbn/cloud-security-posture';
import type { EntityURLStateResult } from './hooks/use_entity_url_state';
import { ENTITY_FIELDS, TEST_SUBJ_GROUPING, TEST_SUBJ_GROUPING_LOADING } from './constants';
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
  const onChangePageRef = useRef(state.onChangePage);
  onChangePageRef.current = state.onChangePage;

  const { groupData, grouping, isFetching } = useEntityGrouping({
    state,
    selectedGroup,
    groupFilters: [],
  });

  useEffect(() => {
    onChangePageRef.current(0);
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
          selectedGroup={selectedGroup}
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
  selectedGroup: string;
  selectedGroupOptions: string[];
  parentGroupFilters?: string;
  groupSelectorComponent?: JSX.Element;
}

const mergeCurrentAndParentFilters = (
  currentGroupFilters: Filter[],
  parentGroupFilters: string | undefined
) => {
  return [...currentGroupFilters, ...(parentGroupFilters ? JSON.parse(parentGroupFilters) : [])];
};

type MatchPhraseValue = string | { query: string };
type MatchPhraseQuery = Record<string, MatchPhraseValue>;

const getMatchPhraseStringValue = (value: MatchPhraseValue): string =>
  typeof value === 'string' ? value : value.query;

/**
 * Builds a bool/should query that matches both the target entity (by entity.id)
 * and its aliases (by resolved_to) for a given target entity ID.
 */
const buildResolutionBoolQuery = (targetEntityId: string) => ({
  bool: {
    should: [
      { term: { [ENTITY_FIELDS.ENTITY_ID]: targetEntityId } },
      { term: { [ENTITY_FIELDS.RESOLVED_TO]: targetEntityId } },
    ],
    minimum_should_match: 1,
  },
});

/**
 * Processes group filters from @kbn/grouping, replacing resolution-specific
 * filters with a single correct bool/should query that includes both the target
 * entity (by entity.id) and its aliases (by resolved_to).
 *
 * @kbn/grouping generates multiple filter shapes per expanded group (match_phrase,
 * script, etc.), all tagged with meta.key equal to the grouped field. For resolution
 * groups, these standard filters exclude the target entity (which has no resolved_to
 * set), so we replace ALL resolution filters with a single correct bool/should and
 * pass non-resolution filters through unchanged.
 *
 * The replacement filter intentionally omits meta.key so downstream calls won't
 * re-identify it as a resolution filter needing transformation.
 */
export const processGroupFilters = (filters: Filter[]): Filter[] => {
  const resolutionFilters: Filter[] = [];
  const otherFilters: Filter[] = [];

  for (const f of filters) {
    if (f?.query) {
      if (f?.meta?.key === ENTITY_FIELDS.RESOLVED_TO) {
        resolutionFilters.push(f);
      } else {
        otherFilters.push(f);
      }
    }
  }

  if (resolutionFilters.length === 0) return otherFilters;

  const targetEntityId = resolutionFilters
    .map((f) => {
      const matchPhrase = f?.query?.match_phrase as MatchPhraseQuery | undefined;
      if (!matchPhrase) return undefined;
      const value = matchPhrase[ENTITY_FIELDS.RESOLVED_TO];
      return value ? getMatchPhraseStringValue(value) : undefined;
    })
    .find(Boolean);

  if (!targetEntityId) return otherFilters;

  const resolutionFilter: Filter = {
    query: buildResolutionBoolQuery(targetEntityId),
    meta: {},
  };

  return [resolutionFilter, ...otherFilters];
};

const GroupContent = ({
  currentGroupFilters,
  state,
  groupingLevel,
  selectedGroup,
  selectedGroupOptions,
  parentGroupFilters,
  groupSelectorComponent,
}: GroupContentProps) => {
  if (groupingLevel < selectedGroupOptions.length) {
    const nextGroupingLevel = groupingLevel + 1;

    const newParentGroupFilters = processGroupFilters(
      mergeCurrentAndParentFilters(currentGroupFilters, parentGroupFilters)
    );

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
      selectedGroup={selectedGroup}
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
          currentGroupFilters={currentGroupFilters.filter((f) => f?.query)}
          state={state}
          groupingLevel={groupingLevel}
          selectedGroup={selectedGroup}
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
  selectedGroup?: string;
}

const DataTableWithLocalPagination = ({
  state,
  currentGroupFilters,
  parentGroupFilters,
  selectedGroup,
}: DataTableWithLocalPaginationProps) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const combinedFilters = useMemo(
    () =>
      processGroupFilters(mergeCurrentAndParentFilters(currentGroupFilters, parentGroupFilters))
        .map((f) => f.query)
        .filter((q): q is NonNullable<Filter['query']> => Boolean(q)),
    [currentGroupFilters, parentGroupFilters]
  );

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

  return <EntitiesDataTable state={newState} selectedGroup={selectedGroup} />;
};
