/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { RuleMigrationTaskStats } from '../../../../../../../common/siem_migrations/model/rule_migration.gen';

interface StartMigrationContextValue {
  openFlyout: (migrationStats?: RuleMigrationTaskStats) => void;
  closeFlyout: () => void;
}

const StartMigrationContext = createContext<StartMigrationContextValue | null>(null);

export const StartMigrationContextProvider: React.FC<
  PropsWithChildren<StartMigrationContextValue>
> = React.memo(({ children, openFlyout, closeFlyout }) => {
  const value = useMemo<StartMigrationContextValue>(
    () => ({ openFlyout, closeFlyout }),
    [openFlyout, closeFlyout]
  );
  return <StartMigrationContext.Provider value={value}>{children}</StartMigrationContext.Provider>;
});
StartMigrationContextProvider.displayName = 'StartMigrationContextProvider';

export const useStartMigrationContext = (): StartMigrationContextValue => {
  const context = useContext(StartMigrationContext);
  if (context == null) {
    throw new Error('useStartMigrationContext must be used within a StartMigrationContextProvider');
  }
  return context;
};
