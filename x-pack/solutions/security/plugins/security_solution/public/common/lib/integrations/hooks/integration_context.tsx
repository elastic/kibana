/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import type { Tab } from '../types';

export type ReportLinkClick = (link: string) => void;

export interface IntegrationContextValue {
  spaceId: string;
  integrationTabs: Tab[];
  telemetry: {
    reportLinkClick?: ReportLinkClick;
  };
}
const IntegrationContext = createContext<IntegrationContextValue | null>(null);

export const IntegrationContextProvider: React.FC<
  PropsWithChildren<{ spaceId: string; reportLinkClick?: ReportLinkClick; integrationTabs: Tab[] }>
> = React.memo(({ children, integrationTabs, spaceId, reportLinkClick }) => {
  const value = useMemo<IntegrationContextValue>(
    () => ({ spaceId, integrationTabs, telemetry: { reportLinkClick } }),
    [spaceId, integrationTabs, reportLinkClick]
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
