/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useEnableAssetInventory } from './use_enable_asset_inventory';

export const mockUseEnableAssetInventory = (
  overrides?: Partial<ReturnType<typeof useEnableAssetInventory>>
) => {
  const defaultMock: Partial<ReturnType<typeof useEnableAssetInventory>> = {
    isEnabling: false,
    error: null,
    reset: jest.fn(),
    enableAssetInventory: jest.fn(),
    ...overrides,
  };
  return defaultMock;
};
