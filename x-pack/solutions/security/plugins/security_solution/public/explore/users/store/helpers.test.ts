/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addAssetTableField, removeAssetTableField } from './helpers';
import { UserAssetTableType } from './model';

describe('Users store helpers', () => {
  const fieldName = 'test-field-name';
  const emptyTableById = {
    [UserAssetTableType.assetEntra]: {
      fields: [],
    },
    [UserAssetTableType.assetOkta]: {
      fields: [],
    },
  };

  test('addAssetTableField', () => {
    expect(
      addAssetTableField({
        tableById: emptyTableById,
        tableId: UserAssetTableType.assetEntra,
        fieldName,
      })
    ).toEqual({
      ...emptyTableById,
      [UserAssetTableType.assetEntra]: {
        fields: [fieldName],
      },
    });
  });

  test('addAssetTableField does not add field if it already exists', () => {
    const tableById = {
      ...emptyTableById,
      [UserAssetTableType.assetEntra]: {
        fields: [fieldName],
      },
    };

    expect(
      addAssetTableField({
        tableById,
        tableId: UserAssetTableType.assetEntra,
        fieldName,
      })
    ).toBe(tableById);
  });

  test('removeAssetTableField', () => {
    expect(
      removeAssetTableField({
        tableById: {
          ...emptyTableById,
          [UserAssetTableType.assetEntra]: {
            fields: [fieldName],
          },
        },
        tableId: UserAssetTableType.assetEntra,
        fieldName,
      })
    ).toEqual(emptyTableById);
  });
});
