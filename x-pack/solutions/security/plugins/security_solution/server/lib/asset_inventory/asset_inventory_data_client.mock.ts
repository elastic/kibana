/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetInventoryDataClient } from './asset_inventory_data_client';

const createAssetInventoryDataClientMock = () =>
  ({
    init: jest.fn(),
    enable: jest.fn(),
    delete: jest.fn(),
    installAssetInventoryDataView: jest.fn(),
  } as unknown as jest.Mocked<AssetInventoryDataClient>);

export const AssetInventoryDataClientMock = { create: createAssetInventoryDataClientMock };
