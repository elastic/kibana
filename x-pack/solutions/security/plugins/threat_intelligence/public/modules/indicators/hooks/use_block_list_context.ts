/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useContext } from 'react';
import { BlockListContext, BlockListContextValue } from '../containers/block_list_provider';

/**
 * Hook to retrieve {@link BlockListContext}
 */
export const useBlockListContext = (): BlockListContextValue => {
  const contextValue = useContext(BlockListContext);

  if (!contextValue) {
    throw new Error('BlockListContext can only be used within BlockListContext provider');
  }

  return contextValue;
};
