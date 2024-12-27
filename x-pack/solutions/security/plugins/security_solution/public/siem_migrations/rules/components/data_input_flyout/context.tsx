/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, type PropsWithChildren } from 'react';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';

interface RuleMigrationDataInputContextValue {
  openFlyout: (migrationStats?: RuleMigrationTaskStats) => void;
  closeFlyout: () => void;
}

const RuleMigrationDataInputContext = createContext<RuleMigrationDataInputContextValue | null>(
  null
);

export const RuleMigrationDataInputContextProvider: React.FC<
  PropsWithChildren<RuleMigrationDataInputContextValue>
> = React.memo(({ children, openFlyout, closeFlyout }) => {
  const value = useMemo<RuleMigrationDataInputContextValue>(
    () => ({ openFlyout, closeFlyout }),
    [openFlyout, closeFlyout]
  );
  return (
    <RuleMigrationDataInputContext.Provider value={value}>
      {children}
    </RuleMigrationDataInputContext.Provider>
  );
});
RuleMigrationDataInputContextProvider.displayName = 'RuleMigrationDataInputContextProvider';

export const useRuleMigrationDataInputContext = (): RuleMigrationDataInputContextValue => {
  const context = useContext(RuleMigrationDataInputContext);
  if (context == null) {
    throw new Error(
      'useRuleMigrationDataInputContext must be used within a RuleMigrationDataInputContextProvider'
    );
  }
  return context;
};
