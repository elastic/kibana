/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { MigrationStats } from '../../types';

interface MigrationDataInputContextValue {
  openFlyout: (migrationStats?: MigrationStats) => void;
  closeFlyout: () => void;
  isFlyoutOpen: boolean;
}

const MigrationDataInputContext = createContext<MigrationDataInputContextValue | null>(null);

export const MigrationDataInputContextProvider: React.FC<
  PropsWithChildren<MigrationDataInputContextValue>
> = React.memo(({ children, openFlyout, closeFlyout, isFlyoutOpen }) => {
  const value = useMemo<MigrationDataInputContextValue>(
    () => ({ openFlyout, closeFlyout, isFlyoutOpen }),
    [openFlyout, closeFlyout, isFlyoutOpen]
  );
  return (
    <MigrationDataInputContext.Provider value={value}>
      {children}
    </MigrationDataInputContext.Provider>
  );
});
MigrationDataInputContextProvider.displayName = 'MigrationDataInputContextProvider';

export const useMigrationDataInputContext = (): MigrationDataInputContextValue => {
  const context = useContext(MigrationDataInputContext);
  if (context == null) {
    throw new Error(
      'useMigrationDataInputContext must be used within a MigrationDataInputContextProvider'
    );
  }
  return context;
};
