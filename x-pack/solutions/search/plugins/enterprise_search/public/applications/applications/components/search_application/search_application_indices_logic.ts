/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import {
  UpdateSearchApplicationApiLogic,
  UpdateSearchApplicationApiLogicActions,
} from '../../api/search_applications/update_search_application_api_logic';

import {
  SearchApplicationViewActions,
  SearchApplicationViewLogic,
  SearchApplicationViewValues,
} from './search_application_view_logic';

export interface SearchApplicationIndicesLogicActions {
  addIndicesToSearchApplication: (indices: string[]) => { indices: string[] };
  closeAddIndicesFlyout: () => void;
  fetchSearchApplication: SearchApplicationViewActions['fetchSearchApplication'];
  openAddIndicesFlyout: () => void;
  removeIndexFromSearchApplication: (indexName: string) => { indexName: string };
  searchApplicationUpdated: UpdateSearchApplicationApiLogicActions['apiSuccess'];
  updateSearchApplicationRequest: UpdateSearchApplicationApiLogicActions['makeRequest'];
}

export interface SearchApplicationIndicesLogicValues {
  addIndicesFlyoutOpen: boolean;
  isLoadingSearchApplication: SearchApplicationViewValues['isLoadingSearchApplication'];
  searchApplicationData: SearchApplicationViewValues['searchApplicationData'];
  searchApplicationName: SearchApplicationViewValues['searchApplicationName'];
}

export const SearchApplicationIndicesLogic = kea<
  MakeLogicType<SearchApplicationIndicesLogicValues, SearchApplicationIndicesLogicActions>
>({
  actions: {
    addIndicesToSearchApplication: (indices) => ({ indices }),
    closeAddIndicesFlyout: () => true,
    openAddIndicesFlyout: () => true,
    removeIndexFromSearchApplication: (indexName) => ({ indexName }),
  },
  connect: {
    actions: [
      SearchApplicationViewLogic,
      ['fetchSearchApplication'],
      UpdateSearchApplicationApiLogic,
      ['makeRequest as updateSearchApplicationRequest', 'apiSuccess as searchApplicationUpdated'],
    ],
    values: [
      SearchApplicationViewLogic,
      ['searchApplicationData', 'searchApplicationName', 'isLoadingSearchApplication'],
    ],
  },
  listeners: ({ actions, values }) => ({
    addIndicesToSearchApplication: ({ indices }) => {
      if (!values.searchApplicationData) return;
      const existingIndicesNames = values.searchApplicationData.indices.map((index) => index.name);
      const updatedIndices = Array.from(new Set([...existingIndicesNames, ...indices]));
      actions.updateSearchApplicationRequest({
        name: values.searchApplicationName,
        indices: updatedIndices,
        template: values.searchApplicationData.template,
      });
    },
    searchApplicationUpdated: () => {
      actions.fetchSearchApplication({ name: values.searchApplicationName });
    },
    removeIndexFromSearchApplication: ({ indexName }) => {
      if (!values.searchApplicationData) return;
      const updatedIndices = values.searchApplicationData.indices
        .filter((index) => index.name !== indexName)
        .map((index) => index.name);
      actions.updateSearchApplicationRequest({
        name: values.searchApplicationName,
        indices: updatedIndices,
        template: values.searchApplicationData.template,
      });
    },
  }),
  path: ['enterprise_search', 'content', 'search_application_indices_logic'],
  reducers: {
    addIndicesFlyoutOpen: [
      false,
      {
        closeAddIndicesFlyout: () => false,
        openAddIndicesFlyout: () => true,
      },
    ],
  },
});
