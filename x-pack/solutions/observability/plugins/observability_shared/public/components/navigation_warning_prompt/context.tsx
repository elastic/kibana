/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, PropsWithChildren } from 'react';
import { createContext, useContext } from 'react';

interface ContextValues {
  prompt?: string;
  setPrompt: (prompt: string | undefined) => void;
}

export const NavigationWarningPromptContext = createContext<ContextValues>({
  setPrompt: (prompt: string | undefined) => {},
});

export const useNavigationWarningPrompt = () => {
  return useContext(NavigationWarningPromptContext);
};

export function NavigationWarningPromptProvider({ children }: PropsWithChildren<{}>) {
  const [prompt, setPrompt] = useState<string | undefined>(undefined);

  return (
    <NavigationWarningPromptContext.Provider value={{ prompt, setPrompt }}>
      {children}
    </NavigationWarningPromptContext.Provider>
  );
}
