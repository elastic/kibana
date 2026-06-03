/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';

/**
 * The HTTP paths the onboarding UI uses to talk to its backend. Each hosting
 * plugin registers its own routes (one plugin per Kibana instance) and
 * provides the matching paths via the context.
 */
export interface OnboardingApiPaths {
  /** POST endpoint that gets-or-creates an onboarding API key.
   *  Returns `{ id, name, encoded }` when a new key is created.
   *  Returns `{ id: null, name: null, encoded: null }` when an active onboarding key already exists. */
  apiKey: string;
  /** GET endpoint returning `{ indicesCount, vectorDocsCount, storeSizeBytes }`. */
  deploymentStats: string;
}

const OnboardingApiPathsContext = createContext<OnboardingApiPaths | null>(null);

export const OnboardingApiPathsProvider: React.FC<
  React.PropsWithChildren<{ paths: OnboardingApiPaths }>
> = ({ paths, children }) => (
  <OnboardingApiPathsContext.Provider value={paths}>{children}</OnboardingApiPathsContext.Provider>
);

export const useOnboardingApiPaths = (): OnboardingApiPaths => {
  const value = useContext(OnboardingApiPathsContext);
  if (!value) {
    throw new Error('useOnboardingApiPaths must be called inside an <OnboardingApiPathsProvider>');
  }
  return value;
};
