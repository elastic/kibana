/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SnippetData } from './snippets';
import { getSnippets } from './api';

interface SnippetsContextValue {
  snippets: SnippetData[];
  setSnippets: React.Dispatch<React.SetStateAction<SnippetData[]>>;
}
export const SnippetsContextDefaultValue: SnippetsContextValue = {
  snippets: [],
  setSnippets: () => {},
};

export const SnippetsContext = React.createContext<SnippetsContextValue>(
  SnippetsContextDefaultValue
);

export const SnippetsContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [snippets, setSnippets] = React.useState<SnippetData[]>(getSnippets());

  return (
    <SnippetsContext.Provider value={{ snippets, setSnippets }}>
      {children}
    </SnippetsContext.Provider>
  );
};

export const useSnippetsContext = () => React.useContext(SnippetsContext);
