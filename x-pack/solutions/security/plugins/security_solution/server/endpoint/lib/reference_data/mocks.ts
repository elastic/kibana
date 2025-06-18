/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepPartial } from 'utility-types';
import { merge } from 'lodash';
import type { ReferenceDataClientInterface, ReferenceDataSavedObject } from './types';
import { REF_DATA_KEYS } from './constants';

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
): jest.Mocked<ReferenceDataClientInterface> => {
  return {
    get: jest.fn().mockReturnValue(refData),
    create: jest.fn().mockReturnValue(refData),
    update: jest.fn().mockReturnValue(refData),
    delete: jest.fn(),
  };
};

export const referenceDataMocks = Object.freeze({
  createClient: createReferenceDataClientMock,
  createItem: createReferenceDataItemMock,
});
