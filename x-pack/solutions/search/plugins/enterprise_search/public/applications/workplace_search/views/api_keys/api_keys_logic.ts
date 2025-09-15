/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Meta } from '../../../../../common/types';
import { DEFAULT_META } from '../../../shared/constants';
import {
  clearFlashMessages,
  flashSuccessToast,
  flashAPIErrors,
} from '../../../shared/flash_messages';
import { HttpLogic } from '../../../shared/http';
import { updateMetaPageIndex } from '../../../shared/table_pagination';

import { ApiToken } from '../../types';

import { CREATE_MESSAGE, DELETE_MESSAGE } from './constants';

const formatApiName = (rawName: string): string =>
  rawName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-') // Replace all special/non-alphanumerical characters with dashes
    .replace(/^[-]+|[-]+$/g, '') // Strip all leading and trailing dashes
    .toLowerCase();

export const defaultApiToken: ApiToken = {
  name: '',
};

interface ApiKeysLogicActions {
  onApiTokenCreateSuccess(apiToken: ApiToken): ApiToken;
  onApiTokenError(formErrors: string[]): string[];
  setApiKeysData(meta: Meta, apiTokens: ApiToken[]): { meta: Meta; apiTokens: ApiToken[] };
  setNameInputBlurred(isBlurred: boolean): boolean;
  setApiKeyName(name: string): string;
  showApiKeyForm(): void;
  hideApiKeyForm(): { value: boolean };
  resetApiKeys(): { value: boolean };
  fetchApiKeys(): void;
  onPaginate(newPageIndex: number): { newPageIndex: number };
  deleteApiKey(): void;
  onApiFormSubmit(): void;
  stageTokenNameForDeletion(tokenName: string): string;
  hideDeleteModal(): void;
}

interface ApiKeysLogicValues {
  activeApiToken: ApiToken;
  activeApiTokenRawName: string;
  apiTokens: ApiToken[];
  dataLoading: boolean;
  formErrors: string[];
  meta: Meta;
  nameInputBlurred: boolean;
  apiKeyFormVisible: boolean;
  deleteModalVisible: boolean;
  apiTokenNameToDelete: string;
}

export const ApiKeysLogic = kea<MakeLogicType<ApiKeysLogicValues, ApiKeysLogicActions>>({
  path: ['enterprise_search', 'workplace_search', 'api_keys_logic'],
  actions: () => ({
    onApiTokenCreateSuccess: (apiToken) => apiToken,
    onApiTokenError: (formErrors) => formErrors,
    setApiKeysData: (meta, apiTokens) => ({ meta, apiTokens }),
    setNameInputBlurred: (nameInputBlurred) => nameInputBlurred,
    setApiKeyName: (name) => name,
    showApiKeyForm: true,
    hideApiKeyForm: false,
    resetApiKeys: false,
    fetchApiKeys: true,
    onPaginate: (newPageIndex) => ({ newPageIndex }),
    deleteApiKey: true,
    stageTokenNameForDeletion: (tokenName) => tokenName,
    hideDeleteModal: true,
    onApiFormSubmit: () => null,
  }),
  reducers: () => ({
    dataLoading: [
      true,
      {
        setApiKeysData: () => false,
      },
    ],
    apiTokens: [
      [],
      {
        setApiKeysData: (_, { apiTokens }) => apiTokens,
        onApiTokenCreateSuccess: (apiTokens, apiToken) => [...apiTokens, apiToken],
      },
    ],
    meta: [
      DEFAULT_META,
      {
        setApiKeysData: (_, { meta }) => meta,
        onPaginate: (state, { newPageIndex }) => updateMetaPageIndex(state, newPageIndex),
      },
    ],
    nameInputBlurred: [
      false,
      {
        setNameInputBlurred: (_, nameInputBlurred) => nameInputBlurred,
      },
    ],
    activeApiToken: [
      defaultApiToken,
      {
        onApiTokenCreateSuccess: () => defaultApiToken,
        hideApiKeyForm: () => defaultApiToken,
        setApiKeyName: (activeApiToken, name) => ({ ...activeApiToken, name: formatApiName(name) }),
      },
    ],
    activeApiTokenRawName: [
      '',
      {
        setApiKeyName: (_, activeApiTokenRawName) => activeApiTokenRawName,
        hideApiKeyForm: () => '',
        onApiTokenCreateSuccess: () => '',
      },
    ],
    apiKeyFormVisible: [
      false,
      {
        showApiKeyForm: () => true,
        hideApiKeyForm: () => false,
        onApiTokenCreateSuccess: () => false,
      },
    ],
    deleteModalVisible: [
      false,
      {
        stageTokenNameForDeletion: () => true,
        hideDeleteModal: () => false,
      },
    ],
    apiTokenNameToDelete: [
      '',
      {
        stageTokenNameForDeletion: (_, tokenName) => tokenName,
        hideDeleteModal: () => '',
      },
    ],
    formErrors: [
      [],
      {
        onApiTokenError: (_, formErrors) => formErrors,
        onApiTokenCreateSuccess: () => [],
        showApiKeyForm: () => [],
        resetApiKeys: () => [],
      },
    ],
  }),
  listeners: ({ actions, values }) => ({
    showApiKeyForm: () => {
      clearFlashMessages();
    },
    fetchApiKeys: async () => {
      try {
        const { http } = HttpLogic.values;
        const { meta } = values;
        const query = {
          'page[current]': meta.page.current,
          'page[size]': meta.page.size,
        };
        const response = await http.get<{ meta: Meta; results: ApiToken[] }>(
          '/internal/workplace_search/api_keys',
          { query }
        );
        actions.setApiKeysData(response.meta, response.results);
      } catch (e) {
        flashAPIErrors(e);
      }
    },
    deleteApiKey: async () => {
      const { apiTokenNameToDelete } = values;

      try {
        const { http } = HttpLogic.values;
        await http.delete(`/internal/workplace_search/api_keys/${apiTokenNameToDelete}`);

        actions.fetchApiKeys();
        flashSuccessToast(DELETE_MESSAGE(apiTokenNameToDelete));
      } catch (e) {
        flashAPIErrors(e);
      } finally {
        actions.hideDeleteModal();
      }
    },
    onApiFormSubmit: async () => {
      const { name } = values.activeApiToken;

      const data: ApiToken = {
        name,
      };

      try {
        const { http } = HttpLogic.values;
        const body = JSON.stringify(data);

        const response = await http.post<ApiToken>('/internal/workplace_search/api_keys', { body });
        actions.onApiTokenCreateSuccess(response);
        flashSuccessToast(CREATE_MESSAGE(name));
      } catch (e) {
        flashAPIErrors(e);
      }
    },
  }),
});
