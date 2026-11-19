/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { WorkflowMigrationDataInputFlyout } from './data_input_flyout';
import { MigrationDataInputContextProvider } from '../../../common/components';

interface WorkflowMigrationDataInputWrapperProps {
  onFlyoutClosed: () => void;
}

export const WorkflowMigrationDataInputWrapper = React.memo<
  PropsWithChildren<WorkflowMigrationDataInputWrapperProps>
>(({ children, onFlyoutClosed }) => {
  const { isOpen: isFlyoutOpen, open: openFlyout, close: closeFlyout } = useIsOpenState(false);

  const closeFlyoutHandler = React.useCallback(() => {
    closeFlyout();
    onFlyoutClosed();
  }, [closeFlyout, onFlyoutClosed]);

  return (
    <MigrationDataInputContextProvider
      openFlyout={openFlyout}
      closeFlyout={closeFlyoutHandler}
      isFlyoutOpen={isFlyoutOpen}
    >
      {children}
      {isFlyoutOpen && <WorkflowMigrationDataInputFlyout onClose={closeFlyoutHandler} />}
    </MigrationDataInputContextProvider>
  );
});
WorkflowMigrationDataInputWrapper.displayName = 'WorkflowMigrationDataInputWrapper';
