/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../common/types/api';
import { FetchSearchApplicationApiLogic } from '../../api/search_applications/fetch_search_application_api_logic';
import {
  SearchApplicationViewActions,
  SearchApplicationViewLogic,
  SearchApplicationViewValues,
} from '../search_application/search_application_view_logic';

export interface SearchApplicationIndicesFlyoutValues {
  fetchSearchApplicationApiError?: SearchApplicationViewValues['fetchSearchApplicationApiError'];
  fetchSearchApplicationApiStatus: SearchApplicationViewValues['fetchSearchApplicationApiStatus'];
  isFlyoutVisible: boolean;
  isSearchApplicationLoading: SearchApplicationViewValues['isLoadingSearchApplication'];
  searchApplicationData: SearchApplicationViewValues['searchApplicationData']; // data from fetchSearchApplication API
  searchApplicationName: string | null;
}
export interface SearchApplicationIndicesFlyoutActions {
  closeFlyout(): void;
  fetchSearchApplication: SearchApplicationViewActions['fetchSearchApplication'] | null;
  openFlyout: (name: string) => { name: string };
}

export const SearchApplicationIndicesFlyoutLogic = kea<
  MakeLogicType<SearchApplicationIndicesFlyoutValues, SearchApplicationIndicesFlyoutActions>
>({
  actions: {
    closeFlyout: true,
    openFlyout: (name) => ({ name }),
  },
  connect: {
    actions: [SearchApplicationViewLogic, ['fetchSearchApplication']],
    values: [
      SearchApplicationViewLogic,
      [
        'searchApplicationData',
        'fetchSearchApplicationApiError',
        'fetchSearchApplicationApiStatus',
      ],
    ],
  },
  listeners: ({}) => ({
    openFlyout: async ({ name }) => {
      FetchSearchApplicationApiLogic.actions.makeRequest({ name });
    },
  }),
  path: ['enterprise_search', 'search_applications', 'search_application_indices_flyout_logic'],
  reducers: ({}) => ({
    isFlyoutVisible: [
      false,
      {
        closeFlyout: () => false,
        openFlyout: () => true,
      },
    ],
    searchApplicationName: [
      null,
      {
        closeFlyout: () => null,
        // @ts-expect-error upgrade typescript v5.1.6
        openFlyout: (_, { name }) => name,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    isSearchApplicationLoading: [
      () => [selectors.fetchSearchApplicationApiStatus],
      (status: SearchApplicationIndicesFlyoutValues['fetchSearchApplicationApiStatus']) =>
        [Status.LOADING].includes(status),
    ],
  }),
});
