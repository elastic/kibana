/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../common/types/api';
import { GenerateSearchApplicationApiKeyLogic } from '../../../api/search_applications/generate_search_application_api_key_logic';

interface SearchApplicationAPIActions {
  apiError: typeof GenerateSearchApplicationApiKeyLogic.actions.apiError;
  apiReset: typeof GenerateSearchApplicationApiKeyLogic.actions.apiReset;
  closeGenerateModal: void;
  openGenerateModal: void;
}

export interface SearchApplicationAPILogicValues {
  apiKey: string;
  apiKeyData: typeof GenerateSearchApplicationApiKeyLogic.values.data;
  apiKeyStatus: typeof GenerateSearchApplicationApiKeyLogic.values.status;
  isError: boolean;
  isGenerateModalOpen: boolean;
}

export const SearchApplicationApiLogic = kea<
  MakeLogicType<SearchApplicationAPILogicValues, SearchApplicationAPIActions>
>({
  actions: {
    closeGenerateModal: true,
    openGenerateModal: true,
  },
  connect: {
    actions: [GenerateSearchApplicationApiKeyLogic, ['apiReset']],
    values: [
      GenerateSearchApplicationApiKeyLogic,
      ['data as apiKeyData', 'status as apiKeyStatus'],
    ],
  },
  listeners: ({ actions }) => ({
    openGenerateModal: () => {
      actions.apiReset();
    },
  }),
  path: ['enterprise_search', 'content', 'search_application_api_logic'],
  reducers: () => ({
    isGenerateModalOpen: [
      false,
      {
        closeGenerateModal: () => false,
        openGenerateModal: () => true,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    apiKey: [
      () => [selectors.apiKeyStatus, selectors.apiKeyData],
      (apiKeyStatus, apiKeyData) =>
        apiKeyStatus === Status.SUCCESS ? apiKeyData.apiKey.encoded : null,
    ],
  }),
});
