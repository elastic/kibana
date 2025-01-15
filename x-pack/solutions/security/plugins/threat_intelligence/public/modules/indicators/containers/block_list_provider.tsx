/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  createContext,
  Dispatch,
  FC,
  PropsWithChildren,
  SetStateAction,
  useState,
} from 'react';

export interface BlockListContextValue {
  blockListIndicatorValue: string;
  setBlockListIndicatorValue: Dispatch<SetStateAction<string>>;
}

export const BlockListContext = createContext<BlockListContextValue | undefined>(undefined);

export const BlockListProvider: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const [blockListIndicatorValue, setBlockListIndicatorValue] = useState('');

  const context: BlockListContextValue = {
    blockListIndicatorValue,
    setBlockListIndicatorValue,
  };
  return <BlockListContext.Provider value={context}>{children}</BlockListContext.Provider>;
};
