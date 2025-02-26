/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FC, PropsWithChildren } from 'react';
import { AssetInventoryContextProvider } from './context';

/**
 * Wrap your plugin with this context for the Asset Inventory React component.
 */
export const AssetInventoryProvider: FC<PropsWithChildren> = ({ children }) => {
  return <AssetInventoryContextProvider>{children}</AssetInventoryContextProvider>;
};
