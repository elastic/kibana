/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IScopedClusterClient } from '@kbn/core/server';

import { ElasticsearchResponseError } from '../../utils/identify_exceptions';

import { deleteAccessControlIndex } from './delete_access_control_index';

describe('deleteAccessControlIndex lib function', () => {
  const mockClient = {
    asCurrentUser: {
      indices: {
        delete: jest.fn(),
      },
    },
    asInternalUser: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when ACL index exists', () => {
    it('should delete index', async () => {
      mockClient.asCurrentUser.indices.delete.mockImplementation(() => true);
      await expect(
        deleteAccessControlIndex(mockClient as unknown as IScopedClusterClient, 'indexName')
      ).resolves.toEqual(true);
      expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
        index: '.search-acl-filter-indexName',
      });
    });
  });

  describe('when ACL index is missing', () => {
    const mockErrorRejection: ElasticsearchResponseError = {
      meta: {
        body: {
          error: {
            type: 'index_not_found_exception',
          },
        },
        statusCode: 404,
      },
      name: 'ResponseError',
    };

    it('exits gracefully', async () => {
      mockClient.asCurrentUser.indices.delete.mockImplementation(() => {
        return Promise.reject(mockErrorRejection);
      });
      await expect(
        deleteAccessControlIndex(mockClient as unknown as IScopedClusterClient, 'indexName')
      ).resolves.not.toThrowError();
      expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
        index: '.search-acl-filter-indexName',
      });
    });
  });

  describe('when index exists but another error is thrown', () => {
    const mockErrorRejection: ElasticsearchResponseError = {
      meta: {
        body: {
          error: {
            type: 'uncaught_exception',
          },
        },
        statusCode: 500,
      },
      name: 'ResponseError',
    };

    it('throws the error', async () => {
      mockClient.asCurrentUser.indices.delete.mockImplementation(() => {
        return Promise.reject(mockErrorRejection);
      });
      await expect(
        deleteAccessControlIndex(mockClient as unknown as IScopedClusterClient, 'indexName')
      ).rejects.toEqual(mockErrorRejection);
      expect(mockClient.asCurrentUser.indices.delete).toHaveBeenCalledWith({
        index: '.search-acl-filter-indexName',
      });
    });
  });
});
