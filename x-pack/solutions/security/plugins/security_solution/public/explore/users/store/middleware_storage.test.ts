/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMockStore, createSecuritySolutionStorageMock } from '../../../common/mock';
import { addUserAssetTableField, removeUserAssetTableField } from './actions';
import { UserAssetTableType } from './model';
import { getUserAssetTableFromStorage } from './storage';

const storage = createSecuritySolutionStorageMock().storage;

describe('UsersAssetTable localStorage middleware', () => {
  it('persist asset table when adding and removing fields', async () => {
    const store = createMockStore(undefined, undefined, undefined, storage);
    const fieldName = 'test-field';

    // Add field to the table
    store.dispatch(addUserAssetTableField({ tableId: UserAssetTableType.assetEntra, fieldName }));
    expect(getUserAssetTableFromStorage(storage)).toEqual({
      [UserAssetTableType.assetEntra]: { fields: [fieldName] },
    });

    // Remove field from the table
    store.dispatch(
      removeUserAssetTableField({ tableId: UserAssetTableType.assetEntra, fieldName })
    );
    expect(getUserAssetTableFromStorage(storage)).toEqual({
      [UserAssetTableType.assetEntra]: { fields: [] },
    });
  });
});
