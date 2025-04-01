/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { History, createMemoryHistory } from 'history';

interface SyntheticsEmbeddableContext {
  history: History;
}

const defaultContext: SyntheticsEmbeddableContext = {} as SyntheticsEmbeddableContext;

export const SyntheticsEmbeddableContext = createContext(defaultContext);

export const SyntheticsEmbeddableStateContextProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const value = useMemo(() => {
    return { history: createMemoryHistory() };
  }, []);

  return <SyntheticsEmbeddableContext.Provider value={value} children={children} />;
};

export const useSyntheticsEmbeddableContext = () => useContext(SyntheticsEmbeddableContext);
