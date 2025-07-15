/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import type { RuleMigrationTaskStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationDataInputFlyout } from './data_input_flyout';
import { MigrationDataInputContextProvider } from '../../../common/components/migration_data_input_flyout_context';

interface RuleMigrationDataInputWrapperProps {
  onFlyoutClosed: () => void;
}
export const RuleMigrationDataInputWrapper = React.memo<
  PropsWithChildren<RuleMigrationDataInputWrapperProps>
>(({ children, onFlyoutClosed }) => {
  const { isOpen: isFlyoutOpen, open: openFlyout, close: closeFlyout } = useIsOpenState(false);
  const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
    RuleMigrationTaskStats | undefined
  >();

  const closeFlyoutHandler = useCallback(() => {
    closeFlyout();
    setFlyoutMigrationStats(undefined);
    onFlyoutClosed?.();
  }, [closeFlyout, onFlyoutClosed]);

  const openFlyoutHandler = useCallback(
    (migrationStats?: RuleMigrationTaskStats) => {
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
        <MigrationDataInputFlyout onClose={closeFlyout} migrationStats={flyoutMigrationStats} />
      )}
    </MigrationDataInputContextProvider>
  );
});
RuleMigrationDataInputWrapper.displayName = 'RuleMigrationDataInputWrapper';
