/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchModels } from './fetch_models_api_logic';

describe('FetchModelsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchModels', () => {
    it('calls correct api', async () => {
      const mockResponseBody = [{ modelId: 'model_1' }, { modelId: 'model_2' }];
      http.get.mockReturnValue(Promise.resolve(mockResponseBody));

      const result = fetchModels();
      await nextTick();
      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/ml/models');
      await expect(result).resolves.toEqual(mockResponseBody);
    });
  });
});
