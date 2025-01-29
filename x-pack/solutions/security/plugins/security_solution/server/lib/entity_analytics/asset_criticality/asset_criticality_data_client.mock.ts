/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AssetCriticalityDataClient } from './asset_criticality_data_client';

const createAssetCriticalityDataClientMock = () =>
  ({
    doesIndexExist: jest.fn(),
    getStatus: jest.fn(),
    init: jest.fn(),
    search: jest.fn(),
  } as unknown as jest.Mocked<AssetCriticalityDataClient>);

export const assetCriticalityDataClientMock = { create: createAssetCriticalityDataClientMock };
