/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import type { SavedObject, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { ReferenceDataClientInterface, ReferenceDataSavedObject } from './types';
import {
  REF_DATA_KEY_INITIAL_VALUE,
  REF_DATA_KEYS,
  REFERENCE_DATA_SAVED_OBJECT_TYPE,
} from './constants';

const createReferenceDataItemMock = <TMeta extends object = {}>(
  overrides: DeepPartial<ReferenceDataSavedObject<TMeta>> = {}
): ReferenceDataSavedObject<TMeta> => {
  return merge(
    {
      id: REF_DATA_KEYS.spaceAwarenessArtifactMigration,
      type: '',
      owner: 'EDR',
      metadata: {},
    },
    overrides
  ) as ReferenceDataSavedObject<TMeta>;
};

const createReferenceDataClientMock = (
  refData: ReferenceDataSavedObject = createReferenceDataItemMock()
): DeeplyMockedKeys<ReferenceDataClientInterface> => {
  return {
    get: jest.fn().mockReturnValue(refData),
    update: jest.fn().mockReturnValue(refData),
    delete: jest.fn(),
  };
};

const applyMocksToSoClient = (soClientMock: ReturnType<typeof savedObjectsClientMock.create>) => {
  const priorCreateMockImplementation = soClientMock.create.getMockImplementation();
  soClientMock.create.mockImplementation(async (...args) => {
    const type = args[0];
    const data = args[1];

    if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
      return {
        id: (data as { id: string }).id,
        type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
        attributes: data,
      } as SavedObject;
    }

    if (priorCreateMockImplementation) {
      return priorCreateMockImplementation(...args);
    }

    return {} as SavedObject;
  });

  const priorGetMockImplementation = soClientMock.get.getMockImplementation();
  soClientMock.get.mockImplementation(async (...args) => {
    const type = args[0];
    const key = args[1];

    if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
      return {
        id: key,
        type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
        attributes: REF_DATA_KEY_INITIAL_VALUE[key as keyof typeof REF_DATA_KEY_INITIAL_VALUE](),
      } as SavedObject;
    }

    if (priorGetMockImplementation) {
      return priorGetMockImplementation(...args);
    }

    return {} as SavedObject;
  });

  const priorUpdateMockImplementation = soClientMock.update.getMockImplementation();
  soClientMock.update.mockImplementation(async (...args) => {
    const type = args[0];
    const key = args[1];
    const data = args[2];

    if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
      return {
        id: key,
        type: REFERENCE_DATA_SAVED_OBJECT_TYPE,
        attributes: data,
      } as SavedObjectsUpdateResponse;
    }

    if (priorUpdateMockImplementation) {
      return priorUpdateMockImplementation(...args);
    }

    return {} as SavedObjectsUpdateResponse;
  });

  const priorDeleteMockImplementation = soClientMock.delete.getMockImplementation();
  soClientMock.delete.mockImplementation(async (...args) => {
    const type = args[0];

    if (type === REFERENCE_DATA_SAVED_OBJECT_TYPE) {
      return {};
    }

    if (priorDeleteMockImplementation) {
      return priorDeleteMockImplementation(...args);
    }

    return {};
  });
};

export const referenceDataMocks = Object.freeze({
  createClient: createReferenceDataClientMock,
  createItem: createReferenceDataItemMock,
  applyMocksToSoClient,
});
