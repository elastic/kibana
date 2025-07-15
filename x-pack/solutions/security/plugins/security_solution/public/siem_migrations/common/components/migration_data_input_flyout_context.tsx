/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { RuleMigrationTaskStats } from '../../../../common/siem_migrations/model/rule_migration.gen';

interface MigrationDataInputContextValue {
  openFlyout: (migrationStats?: RuleMigrationTaskStats) => void;
  closeFlyout: () => void;
}

const MigrationDataInputContext = createContext<MigrationDataInputContextValue | null>(null);

export const MigrationDataInputContextProvider: React.FC<
  PropsWithChildren<MigrationDataInputContextValue>
> = React.memo(({ children, openFlyout, closeFlyout }) => {
  const value = useMemo<MigrationDataInputContextValue>(
    () => ({ openFlyout, closeFlyout }),
    [openFlyout, closeFlyout]
  );
  return (
    <MigrationDataInputContext.Provider value={value}>
      {children}
    </MigrationDataInputContext.Provider>
  );
});
MigrationDataInputContextProvider.displayName = 'RuleMigrationDataInputContextProvider';

export const useMigrationDataInputContext = (): MigrationDataInputContextValue => {
  const context = useContext(MigrationDataInputContext);
  if (context == null) {
    throw new Error(
      'useMigrationDataInputContext must be used within a MigrationDataInputContextProvider'
    );
  }
  return context;
};
