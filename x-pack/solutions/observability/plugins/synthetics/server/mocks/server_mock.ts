/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { SyntheticsServerSetup } from '../types';
import { mockEncryptedSO } from '../synthetics_service/utils/mocks';

export const getServerMock = () => {
  const logger = loggerMock.create();

  const serverMock: SyntheticsServerSetup = {
    syntheticsEsClient: { search: jest.fn() },
    stackVersion: null,
    authSavedObjectsClient: {
      bulkUpdate: jest.fn(),
      get: jest.fn(),
      update: jest.fn(),
      createPointInTimeFinder: jest.fn().mockImplementation(({ perPage, type: soType }) => ({
        close: jest.fn(async () => {}),
        find: jest.fn().mockReturnValue({
          async *[Symbol.asyncIterator]() {
            yield {
              saved_objects: [],
            };
          },
        }),
      })),
    },
    logger,
    config: {
      service: {
        username: 'dev',
        password: '12345',
      },
    },
    fleet: {
      packagePolicyService: {
        get: jest.fn().mockReturnValue({}),
        getByIDs: jest.fn().mockReturnValue([]),
        buildPackagePolicyFromPackage: jest.fn().mockReturnValue({}),
      },
    },
    encryptedSavedObjects: mockEncryptedSO(),
  } as unknown as SyntheticsServerSetup;

  return serverMock;
};
