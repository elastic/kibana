/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

export type TrackLinkClick = (link: string) => void;

export interface IntegrationContextValue {
  spaceId: string;
  telemetry: { trackLinkClick?: TrackLinkClick };
}
const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export const IntegrationContextProvider: React.FC<
  PropsWithChildren<{ spaceId: string; trackLinkClick?: TrackLinkClick }>
> = React.memo(({ children, spaceId, trackLinkClick }) => {
  const value = useMemo<IntegrationContextValue>(
    () => ({ spaceId, telemetry: { trackLinkClick } }),
    [spaceId, trackLinkClick]
  );

  return <IntegrationContext.Provider value={value}>{children}</IntegrationContext.Provider>;
});
IntegrationContextProvider.displayName = 'IntegrationContextProvider';

export const useIntegrationContext = () => {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error(
      'No IntegrationContext found. Please wrap the application with IntegrationContextProvider'
    );
  }
  return context;
};
