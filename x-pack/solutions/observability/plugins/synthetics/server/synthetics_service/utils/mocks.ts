/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import { cloneDeep } from 'lodash';
import { syntheticsParamType } from '../../../common/types/saved_objects';

export const mockEncryptedSO = ({
  monitors = null,
  params,
}: { monitors?: any; params?: any } = {}) => {
  const result = cloneDeep(monitors);
  const mockParams = params ?? [
    { attributes: { key: 'username', value: 'elastic' }, namespaces: ['*'] },
  ];
  return {
    isEncryptionError: jest.fn(),
    getClient: jest.fn().mockReturnValue({
      getDecryptedAsInternalUser: jest.fn().mockResolvedValue(monitors),
      createPointInTimeFinderDecryptedAsInternalUser: jest
        .fn()
        .mockImplementation(({ perPage, type: soType }) => ({
          close: jest.fn(async () => {}),
          find: jest.fn().mockReturnValue({
            async *[Symbol.asyncIterator]() {
              if (soType === syntheticsParamType) {
                yield {
                  saved_objects: mockParams,
                };
                return;
              }
              if (!perPage) {
                yield {
                  saved_objects: result,
                };
                return;
              }
              if (monitors === null) {
                return;
              }
              do {
                const currentPage = result.splice(0, perPage);
                if (currentPage.length === 0) {
                  return;
                }
                yield {
                  saved_objects: currentPage,
                };
              } while (result.length > 0);
            },
          }),
        })),
    } as jest.Mocked<EncryptedSavedObjectsClient>),
  };
};
