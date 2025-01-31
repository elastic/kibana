/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, memo, useContext } from 'react';
import { useAssetInventory } from './hooks/use_asset_inventory';

export const AssetInventoryContext = createContext<undefined | { status: string }>(undefined);

export interface AssetInventoryContextProviderProps {
  /**
   * React components to render
   */
  children: React.ReactNode;
}

/**
 * Context used to share Asset Inventory common values to the rest of the code
 */
export const AssetInventoryContextProvider = memo<AssetInventoryContextProviderProps>(
  ({ children }) => {
    return (
      <AssetInventoryContext.Provider value={useAssetInventory()}>
        {children}
      </AssetInventoryContext.Provider>
    );
  }
);

AssetInventoryContextProvider.displayName = 'AssetInventoryContextProvider';

export const useAssetInventoryContext = () => {
  const context = useContext(AssetInventoryContext);
  if (context === undefined) {
    throw new Error('AssetInventoryContext can only be used within AssetInventoryContext provider');
  }
  return context;
};
