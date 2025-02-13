/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { RuleMigrationDataInputContextProvider } from './context';
import { MigrationDataInputFlyout } from './data_input_flyout';

interface RuleMigrationDataInputWrapperProps {
  onFlyoutClosed: () => void;
}
export const RuleMigrationDataInputWrapper = React.memo<
  PropsWithChildren<RuleMigrationDataInputWrapperProps>
>(({ children, onFlyoutClosed }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>();
  const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
    RuleMigrationTaskStats | undefined
  >();

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setFlyoutMigrationStats(undefined);
    onFlyoutClosed?.();
  }, [onFlyoutClosed]);

  const openFlyout = useCallback((migrationStats?: RuleMigrationTaskStats) => {
    setFlyoutMigrationStats(migrationStats);
    setIsFlyoutOpen(true);
  }, []);

  return (
    <RuleMigrationDataInputContextProvider openFlyout={openFlyout} closeFlyout={closeFlyout}>
      {children}
      {isFlyoutOpen && (
        <MigrationDataInputFlyout onClose={closeFlyout} migrationStats={flyoutMigrationStats} />
      )}
    </RuleMigrationDataInputContextProvider>
  );
});
RuleMigrationDataInputWrapper.displayName = 'RuleMigrationDataInputWrapper';
