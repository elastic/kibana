/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { Status } from '../../../../../../../common/types/api';

import { GenerateApiKeyLogic } from '../../../../api/generate_api_key/generate_api_key_logic';

interface GenerateApiKeyModalActions {
  setKeyName(keyName: string): { keyName: string };
}

interface GenerateApiKeyModalValues {
  apiKey: string;
  data: typeof GenerateApiKeyLogic.values.data;
  isLoading: boolean;
  isSuccess: boolean;
  keyName: string;
  status: typeof GenerateApiKeyLogic.values.status;
}

export const GenerateApiKeyModalLogic = kea<
  MakeLogicType<GenerateApiKeyModalValues, GenerateApiKeyModalActions>
>({
  actions: {
    setKeyName: (keyName) => ({ keyName }),
  },
  connect: {
    values: [GenerateApiKeyLogic, ['data', 'status']],
  },
  path: ['enterprise_search', 'search_index', 'generate_api_key_modal'],
  reducers: () => ({
    keyName: [
      '',
      {
        setKeyName: (_, { keyName }) => keyName,
      },
    ],
  }),
  selectors: ({ selectors }) => ({
    apiKey: [() => [selectors.data], (data) => data?.apiKey?.encoded || ''],
    isLoading: [() => [selectors.status], (status) => status === Status.LOADING],
    isSuccess: [() => [selectors.status], (status) => status === Status.SUCCESS],
  }),
});
