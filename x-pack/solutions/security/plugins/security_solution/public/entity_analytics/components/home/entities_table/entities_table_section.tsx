/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState, useEffect, useMemo } from 'react';
import type { Filter } from '@kbn/es-query';
import { GroupWrapper } from '@kbn/cloud-security-posture';
import type { EntityURLStateResult } from './hooks/use_entity_url_state';
import {
  DEFAULT_TABLE_SECTION_HEIGHT,
  ENTITY_FIELDS,
  ENTITY_GROUPING_OPTIONS,
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
  }, [selectedGroup, state.onChangePage]);

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

const filterTypeGuard = (filter: Filter | null): filter is Filter => filter !== null;

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

export const groupFilterMap = (filter: Filter | null): Filter | null => {
  const query = filter?.query;
  return query?.match_phrase || query?.bool?.should || query?.bool?.filter ? filter : null;
};

/**
 * Transforms a resolution group filter from a simple match_phrase on resolved_to
 * into a bool/should that matches both the target entity (by entity.id) and its
 * aliases (by resolved_to). Without this, expanding a resolution group only shows
 * aliases because the target entity doesn't have resolved_to set.
 */
export const transformResolutionFilter = (filter: Filter): Filter => {
  const matchPhrase = filter?.query?.match_phrase as MatchPhraseQuery | undefined;
  if (!matchPhrase) return filter;

  const resolvedToEntry = matchPhrase[ENTITY_FIELDS.RESOLVED_TO];
  if (!resolvedToEntry) return filter;

  const targetEntityId = getMatchPhraseStringValue(resolvedToEntry);

  return {
    ...filter,
    query: buildResolutionBoolQuery(targetEntityId),
  };
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

    const newParentGroupFilters = mergeCurrentAndParentFilters(
      currentGroupFilters,
      parentGroupFilters
    )
      .map(transformResolutionFilter)
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
          currentGroupFilters={currentGroupFilters.map(groupFilterMap).filter(filterTypeGuard)}
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
  selectedGroup: string;
}

const getDataGridFilter = (filter: Filter | null) => {
  if (!filter) return null;
  return {
    ...(filter?.query ?? {}),
  };
};

export const extractMatchPhraseValue = (filter: Filter, field?: string): string | undefined => {
  const matchPhrase = filter?.query?.match_phrase as MatchPhraseQuery | undefined;
  if (!matchPhrase) return undefined;
  const value = field ? matchPhrase[field] : Object.values(matchPhrase)[0];
  return value ? getMatchPhraseStringValue(value) : undefined;
};

export const buildResolutionGroupFilter = (
  filters: Filter[]
): Array<NonNullable<Filter['query']>> | undefined => {
  const targetEntityId = filters
    .map((f) => extractMatchPhraseValue(f, ENTITY_FIELDS.RESOLVED_TO))
    .find(Boolean);
  if (!targetEntityId) return undefined;

  return [buildResolutionBoolQuery(targetEntityId)];
};

const DataTableWithLocalPagination = ({
  state,
  currentGroupFilters,
  parentGroupFilters,
  selectedGroup,
}: DataTableWithLocalPaginationProps) => {
  const [tablePageIndex, setTablePageIndex] = useState(0);
  const [tablePageSize, setTablePageSize] = useState(10);

  const isResolutionGrouping = selectedGroup === ENTITY_GROUPING_OPTIONS.RESOLUTION;

  const combinedFilters = useMemo(() => {
    const mergedFilters = mergeCurrentAndParentFilters(currentGroupFilters, parentGroupFilters);

    if (isResolutionGrouping) {
      // Use raw filters — buildResolutionGroupFilter extracts the match_phrase
      // value and builds its own bool/should. Applying transformResolutionFilter
      // first would remove the match_phrase, causing it to return undefined.
      const rawFilters = mergedFilters.map(groupFilterMap).filter(filterTypeGuard);
      const resolutionQueryFilter = buildResolutionGroupFilter(rawFilters);
      // Preserve non-resolution filters (e.g., entity type from parent group)
      const nonResolutionFilters = rawFilters
        .filter((f) => !f?.query?.match_phrase?.[ENTITY_FIELDS.RESOLVED_TO])
        .map(getDataGridFilter)
        .filter((f): f is NonNullable<Filter['query']> => Boolean(f));
      return [...(resolutionQueryFilter ?? []), ...nonResolutionFilters];
    }

    // For non-resolution leaf, transform resolution filters first
    // (handles case where resolution is a parent group level)
    return mergedFilters
      .map(transformResolutionFilter)
      .map(groupFilterMap)
      .filter(filterTypeGuard)
      .map(getDataGridFilter)
      .filter((filter): filter is NonNullable<Filter['query']> => Boolean(filter));
  }, [currentGroupFilters, parentGroupFilters, isResolutionGrouping]);

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
