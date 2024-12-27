/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import { JSON_HEADER as headers } from '../../../../../common/constants';
import { Meta } from '../../../../../common/types';
import { DEFAULT_META } from '../../../shared/constants';
import {
  clearFlashMessages,
  flashAPIErrors,
  flashSuccessToast,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { ContentSource, Group } from '../../types';

export const MAX_NAME_LENGTH = 40;

interface GroupsServerData {
  contentSources: ContentSource[];
}

interface GroupsSearchResponse {
  results: Group[];
  meta: Meta;
}

interface GroupsActions {
  onInitializeGroups(data: GroupsServerData): GroupsServerData;
  setSearchResults(data: GroupsSearchResponse): GroupsSearchResponse;
  addFilteredSource(sourceId: string): string;
  removeFilteredSource(sourceId: string): string;
  setFilterValue(filterValue: string): string;
  setActivePage(activePage: number): number;
  setNewGroupName(newGroupName: string): string;
  setNewGroup(newGroup: Group): Group;
  setNewGroupFormErrors(errors: string[]): string[];
  openNewGroupModal(): void;
  closeNewGroupModal(): void;
  closeFilterSourcesDropdown(): void;
  toggleFilterSourcesDropdown(): void;
  setGroupsLoading(): void;
  resetGroupsFilters(): void;
  resetGroups(): void;
  initializeGroups(): void;
  getSearchResults(resetPagination?: boolean): { resetPagination: boolean | undefined };
  saveNewGroup(): void;
}

interface GroupsValues {
  groups: Group[];
  contentSources: ContentSource[];
  groupsDataLoading: boolean;
  groupListLoading: boolean;
  newGroupModalOpen: boolean;
  newGroupName: string;
  newGroup: Group | null;
  newGroupNameErrors: string[];
  filterSourcesDropdownOpen: boolean;
  filteredSources: string[];
  filterValue: string;
  groupsMeta: Meta;
  hasFiltersSet: boolean;
}

export const GroupsLogic = kea<MakeLogicType<GroupsValues, GroupsActions>>({
  path: ['enterprise_search', 'workplace_search', 'groups'],
  actions: {
    onInitializeGroups: (data) => data,
    setSearchResults: (data) => data,
    addFilteredSource: (sourceId) => sourceId,
    removeFilteredSource: (sourceId) => sourceId,
    setFilterValue: (filterValue) => filterValue,
    setActivePage: (activePage) => activePage,
    setNewGroupName: (newGroupName) => newGroupName,
    setNewGroup: (newGroup) => newGroup,
    setNewGroupFormErrors: (errors) => errors,
    openNewGroupModal: () => true,
    closeNewGroupModal: () => true,
    closeFilterSourcesDropdown: () => true,
    toggleFilterSourcesDropdown: () => true,
    setGroupsLoading: () => true,
    resetGroupsFilters: () => true,
    resetGroups: () => true,
    initializeGroups: () => true,
    getSearchResults: (resetPagination) => ({ resetPagination }),
    saveNewGroup: () => true,
  },
  reducers: {
    groups: [
      [] as Group[],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setSearchResults: (_, { results }) => results,
      },
    ],
    contentSources: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        onInitializeGroups: (_, { contentSources }) => contentSources,
      },
    ],
    groupsDataLoading: [
      true,
      {
        onInitializeGroups: () => false,
      },
    ],
    groupListLoading: [
      true,
      {
        setSearchResults: () => false,
        setGroupsLoading: () => true,
      },
    ],
    newGroupModalOpen: [
      false,
      {
        openNewGroupModal: () => true,
        closeNewGroupModal: () => false,
        setNewGroup: () => false,
      },
    ],
    newGroupName: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setNewGroupName: (_, newGroupName) => newGroupName,
        setSearchResults: () => '',
        closeNewGroupModal: () => '',
      },
    ],
    newGroup: [
      null,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setNewGroup: (_, newGroup) => newGroup,
        resetGroups: () => null,
        openNewGroupModal: () => null,
      },
    ],
    newGroupNameErrors: [
      [],
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setNewGroupFormErrors: (_, newGroupNameErrors) => newGroupNameErrors,
        setNewGroup: () => [],
        setNewGroupName: () => [],
        closeNewGroupModal: () => [],
      },
    ],
    filterSourcesDropdownOpen: [
      false,
      {
        // @ts-expect-error upgrade typescript v5.1.6
        toggleFilterSourcesDropdown: (state) => !state,
        closeFilterSourcesDropdown: () => false,
      },
    ],
    filteredSources: [
      [],
      {
        resetGroupsFilters: () => [],
        setNewGroup: () => [],
        // @ts-expect-error upgrade typescript v5.1.6
        addFilteredSource: (state, sourceId) => [...state, sourceId].sort(),
        // @ts-expect-error upgrade typescript v5.1.6
        removeFilteredSource: (state, sourceId) => state.filter((id) => id !== sourceId),
      },
    ],
    filterValue: [
      '',
      {
        // @ts-expect-error upgrade typescript v5.1.6
        setFilterValue: (_, filterValue) => filterValue,
        resetGroupsFilters: () => '',
      },
    ],
    groupsMeta: [
      DEFAULT_META,
      {
        resetGroupsFilters: () => DEFAULT_META,
        setNewGroup: () => DEFAULT_META,
        // @ts-expect-error upgrade typescript v5.1.6
        setSearchResults: (_, { meta }) => meta,
        // @ts-expect-error upgrade typescript v5.1.6
        setActivePage: (state, activePage) => ({
          ...state,
          page: {
            ...state.page,
            current: activePage,
          },
        }),
      },
    ],
  },
  selectors: ({ selectors }) => ({
    hasFiltersSet: [
      () => [selectors.filteredSources],
      (filteredSources) => filteredSources.length > 0,
    ],
  }),
  listeners: ({ actions, values }) => ({
    initializeGroups: async () => {
      try {
        const response = await HttpLogic.values.http.get<GroupsServerData>(
          '/internal/workplace_search/groups'
        );
        actions.onInitializeGroups(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    getSearchResults: async ({ resetPagination }, breakpoint) => {
      // Debounce search results when typing
      await breakpoint(300);

      actions.setGroupsLoading();

      const {
        groupsMeta: {
          page: { current, size },
        },
        filterValue,
        filteredSources,
      } = values;

      // Is the user changes the query while on a different page, we want to start back over at 1.
      const page = {
        current: resetPagination ? 1 : current,
        size,
      };
      const search = {
        query: filterValue,
        content_source_ids: filteredSources,
      };

      try {
        const response = await HttpLogic.values.http.post<GroupsSearchResponse>(
          '/internal/workplace_search/groups/search',
          {
            body: JSON.stringify({
              page,
              search,
            }),
            headers,
          }
        );

        actions.setSearchResults(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    saveNewGroup: async () => {
      try {
        const response = await HttpLogic.values.http.post<Group>(
          '/internal/workplace_search/groups',
          {
            body: JSON.stringify({ group_name: values.newGroupName }),
            headers,
          }
        );
        actions.getSearchResults(true);

        const SUCCESS_MESSAGE = i18n.translate(
          'xpack.enterpriseSearch.workplaceSearch.groups.newGroupSavedSuccess',
          {
            defaultMessage: 'Successfully created {groupName}',
            values: { groupName: response.name },
          }
        );

        flashSuccessToast(SUCCESS_MESSAGE);
        actions.setNewGroup(response);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    setActivePage: () => {
      actions.getSearchResults();
    },
    openNewGroupModal: () => {
      clearFlashMessages();
    },
    resetGroupsFilters: () => {
      clearFlashMessages();
    },
    toggleFilterSourcesDropdown: () => {
      clearFlashMessages();
    },
  }),
});
