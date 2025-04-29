/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { getDocument } from './get_document_logic';

describe('getDocumentApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocument', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve({
        _id: 'test-id',
        _index: 'indexName',
        _source: {},
        found: true,
      });
      http.get.mockReturnValue(promise);
      const result = getDocument({ documentId: '123123', indexName: 'indexName' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/enterprise_search/indices/indexName/document/123123'
      );
      await expect(result).resolves.toEqual({
        _id: 'test-id',
        _index: 'indexName',
        _source: {},
        found: true,
      });
    });
  });
});
