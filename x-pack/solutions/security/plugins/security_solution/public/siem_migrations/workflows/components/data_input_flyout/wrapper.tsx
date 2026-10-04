/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { WorkflowMigrationDataInputFlyout } from './data_input_flyout';
import { MigrationDataInputContextProvider } from '../../../common/components';
import type { MigrationsServiceTaskStats } from '../../../common/service/migrations_service_base';
import type { WorkflowMigrationStats } from '../../types';

interface WorkflowMigrationDataInputWrapperProps {
  onFlyoutClosed: () => void;
}

export const WorkflowMigrationDataInputWrapper = React.memo<
  PropsWithChildren<WorkflowMigrationDataInputWrapperProps>
>(({ children, onFlyoutClosed }) => {
  const { isOpen: isFlyoutOpen, open: openFlyout, close: closeFlyout } = useIsOpenState(false);
  const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
    WorkflowMigrationStats | undefined
  >();

  const closeFlyoutHandler = useCallback(() => {
    closeFlyout();
    setFlyoutMigrationStats(undefined);
    onFlyoutClosed();
  }, [closeFlyout, onFlyoutClosed]);

  const openFlyoutHandler = useCallback(
    (migrationStats?: MigrationsServiceTaskStats) => {
      setFlyoutMigrationStats(migrationStats as WorkflowMigrationStats | undefined);
      openFlyout();
    },
    [openFlyout]
  );

  return (
    <MigrationDataInputContextProvider
      openFlyout={openFlyoutHandler}
      closeFlyout={closeFlyoutHandler}
      isFlyoutOpen={isFlyoutOpen}
    >
      {children}
      {isFlyoutOpen && (
        <WorkflowMigrationDataInputFlyout
          onClose={closeFlyoutHandler}
          migrationStats={flyoutMigrationStats}
          setFlyoutMigrationStats={setFlyoutMigrationStats}
        />
      )}
    </MigrationDataInputContextProvider>
  );
});
WorkflowMigrationDataInputWrapper.displayName = 'WorkflowMigrationDataInputWrapper';
