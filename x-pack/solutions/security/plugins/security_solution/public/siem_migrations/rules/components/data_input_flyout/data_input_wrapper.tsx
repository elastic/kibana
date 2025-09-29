/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React, { useCallback, useState } from 'react';
import { MigrationDataInputContextProvider } from '../../../common/components';
import { MigrationDataInputFlyout } from './data_input_flyout';
import type { RuleMigrationStats } from '../../types';

interface RuleMigrationDataInputWrapperProps {
  onFlyoutClosed: () => void;
}
export const RuleMigrationDataInputWrapper = React.memo<
  PropsWithChildren<RuleMigrationDataInputWrapperProps>
>(({ children, onFlyoutClosed }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState<boolean>();
  const [flyoutMigrationStats, setFlyoutMigrationStats] = useState<
    RuleMigrationStats | undefined
  >();

  const closeFlyout = useCallback(() => {
    setIsFlyoutOpen(false);
    setFlyoutMigrationStats(undefined);
    onFlyoutClosed?.();
  }, [onFlyoutClosed]);

  const openFlyout = useCallback((migrationStats?: RuleMigrationStats) => {
    setFlyoutMigrationStats(migrationStats);
    setIsFlyoutOpen(true);
  }, []);

  return (
    <MigrationDataInputContextProvider openFlyout={openFlyout} closeFlyout={closeFlyout}>
      {children}
      {isFlyoutOpen && (
        <MigrationDataInputFlyout onClose={closeFlyout} migrationStats={flyoutMigrationStats} />
      )}
    </MigrationDataInputContextProvider>
  );
});
RuleMigrationDataInputWrapper.displayName = 'RuleMigrationDataInputWrapper';
