/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export interface ThreatOpenRequest {
  /** 1-based threat rank. */
  rank: number;
  /** Changes on every request, so asking for the same threat twice is still a new request. */
  nonce: number;
}

interface ThreatOpenRequestContextValue {
  request: ThreatOpenRequest | undefined;
  requestOpen: (rank: number) => void;
}

const NOOP_REQUEST = (): void => {};

const ThreatOpenRequestContext = createContext<ThreatOpenRequestContextValue | undefined>(
  undefined
);

/** Holds the latest "open this threat card" request so cards can expand themselves. */
export const ThreatOpenRequestProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [request, setRequest] = useState<ThreatOpenRequest | undefined>();
  const requestOpen = useCallback(
    (rank: number) => setRequest((previous) => ({ rank, nonce: (previous?.nonce ?? 0) + 1 })),
    []
  );
  const value = useMemo(() => ({ request, requestOpen }), [request, requestOpen]);
  return (
    <ThreatOpenRequestContext.Provider value={value}>{children}</ThreatOpenRequestContext.Provider>
  );
};

/** The latest request to expand a threat card; cards expand when it targets their rank. */
export const useThreatOpenRequest = (): ThreatOpenRequest | undefined =>
  useContext(ThreatOpenRequestContext)?.request;

/** Asks the threat card with the given rank to expand. A no-op outside the provider. */
export const useRequestThreatOpen = (): ((rank: number) => void) =>
  useContext(ThreatOpenRequestContext)?.requestOpen ?? NOOP_REQUEST;
