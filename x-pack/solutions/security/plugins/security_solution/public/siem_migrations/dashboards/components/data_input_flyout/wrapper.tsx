/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import type { DashboardMigrationTaskStats } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { DashboardMigrationDataInputFlyout } from './data_input_flyout';
import { MigrationDataInputContextProvider } from '../../../common/components';

interface DashboardMigrationDataInputWrapperProps {
  onFlyoutClosed: () => void;
}
export const DashboardMigrationDataInputWrapper = React.memo<
  PropsWithChildren<DashboardMigrationDataInputWrapperProps>
>(({ children, onFlyoutClosed }) => {
  const { isOpen: isFlyoutOpen, open: openFlyout, close: closeFlyout } = useIsOpenState(false);
  const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
    DashboardMigrationTaskStats | undefined
  >();

  const closeFlyoutHandler = useCallback(() => {
    closeFlyout();
    setFlyoutMigrationStats(undefined);
    onFlyoutClosed?.();
  }, [closeFlyout, onFlyoutClosed]);

  const openFlyoutHandler = useCallback(
    (migrationStats?: DashboardMigrationTaskStats) => {
      setFlyoutMigrationStats(migrationStats);
      openFlyout();
    },
    [openFlyout]
  );

  return (
    <MigrationDataInputContextProvider
      openFlyout={openFlyoutHandler}
      closeFlyout={closeFlyoutHandler}
    >
      {children}
      {isFlyoutOpen && (
        <DashboardMigrationDataInputFlyout
          onClose={closeFlyout}
          migrationStats={flyoutMigrationStats}
          setFlyoutMigrationStats={setFlyoutMigrationStats}
        />
      )}
    </MigrationDataInputContextProvider>
  );
});
DashboardMigrationDataInputWrapper.displayName = 'DashboardMigrationDataInputWrapper';
