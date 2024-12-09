/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createModel } from './create_model_api_logic';

describe('CreateModelApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createModel', () => {
    it('calls correct api', async () => {
      const mockResponseBody = { modelId: 'model_1', deploymentState: '' };
      http.post.mockReturnValue(Promise.resolve(mockResponseBody));

      const result = createModel({ modelId: 'model_1' });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/ml/models/model_1');
      await expect(result).resolves.toEqual(mockResponseBody);
    });
  });
});
